import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parseJSONResponse } from '../services/imageAnalysisService.js';

/**
 * Handle AI Chat queries
 * User asks a question, AI translates to a search, we query DB, AI formats answer.
 */
export const handleAIChat = asyncHandler(async (req, res) => {
  const { message, history = [], userData } = req.body;
  if (!message) return ApiResponse.ok({ text: "Please say something!" }).send(res);

  let userContextText = "";
  if (userData && userData._id) {
    try {
      // Fetch user's recently reported items to provide context to the AI
      const lostItems = await LostItem.find({ user: userData._id }).sort({ createdAt: -1 }).limit(2).lean();
      const foundItems = await FoundItem.find({ reporter: userData._id }).sort({ createdAt: -1 }).limit(2).lean();
      
      const pastItems = [];
      lostItems.forEach(item => pastItems.push(`Lost: ${item.itemName} (${item.status})`));
      foundItems.forEach(item => pastItems.push(`Found: ${item.itemName} (${item.status})`));
      
      userContextText = `User Context:\nYou are talking to: ${userData.fullName}\n`;
      if (pastItems.length > 0) {
        userContextText += `They recently reported these items to the system: ${pastItems.join(', ')}.\nKeep this in mind if they ask about 'my item' or 'my laptop'. You can address them by name occasionally to feel friendly.\n\n`;
      } else {
        userContextText += `They haven't reported any items yet.\n\n`;
      }
    } catch (err) {
      console.error("Error fetching user context:", err);
    }
  }

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const PRIMARY_KEY = process.env.AI_API_KEY || OPENROUTER_KEY;

  if (!PRIMARY_KEY || PRIMARY_KEY === 'your_openrouter_api_key') {
    return ApiResponse.ok({ text: "AI is currently unavailable. Please use the manual search." }).send(res);
  }

  // Format history for the prompt
  const historyText = history.length > 0 
    ? "Conversation History:\n" + history.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n') + "\n\n"
    : "";

  // Helper to safely parse JSON and ignore <think> tags from DeepSeek R1 reasoning models
  const parseJSONResponse = (text) => {
    try {
      let cleanText = text;
      
      // Remove thought process up to the last known think end token
      const altThinkToken = cleanText.lastIndexOf('<｜end▁of▁thinking｜>');
      if (altThinkToken !== -1) {
        cleanText = cleanText.substring(altThinkToken + 19);
      } else {
        const lastThinkToken = cleanText.lastIndexOf('</think>');
        if (lastThinkToken !== -1) {
          cleanText = cleanText.substring(lastThinkToken + 8);
        }
      }
      
      // Also try to find markdown json block first
      const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (mdMatch) {
        const jsonStr = mdMatch[1].replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(jsonStr);
      }

      const match = cleanText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found');
      const jsonStr = match[0].replace(/,\s*([}\]])/g, '$1'); // Fix trailing commas
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  };

  // Helper to make AI calls with robust multi-model and multi-key fallback to ensure it never fails
  const fetchFromAI = async (prompt, format = null) => {
    const primaryUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    
    const isOpencode = primaryUrl.includes('opencode');
    
    const openRouterModels = [
      process.env.AI_CHAT_MODEL || 'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-4-31b-it:free',
      'qwen/qwen3-coder:free',
      'openai/gpt-oss-120b:free'
    ];
    
    const opencodeModels = [
      process.env.AI_CHAT_MODEL || 'deepseek-v4-flash-free',
      'mimo-v2.5-free',
      'nemotron-3-ultra-free',
      'north-mini-code-free',
      'big-pickle'
    ];
    
    const modelsToTry = isOpencode ? opencodeModels : openRouterModels;

    // Support multiple API keys separated by commas for load balancing / fallback
    const apiKeys = PRIMARY_KEY.split(',').map(k => k.trim()).filter(k => k);

    let lastError = null;

    // Outer loop: Try each API key
    for (const key of apiKeys) {
      // Inner loop: Try each model with the current key
      for (const model of modelsToTry) {
        const reqBody = {
          model: model,
          messages: [{ role: 'user', content: prompt }]
        };
        if (format) reqBody.response_format = format;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

          const res = await fetch(primaryUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
              'X-Title': 'Smart Lost and Found'
            },
            body: JSON.stringify(reqBody),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const text = await res.text();
            try { 
              return parseJSONResponse(text); 
            } catch (e) { 
              console.warn(`⚠️ Model ${model} returned invalid JSON with key ${key.substring(0, 8)}...`);
              continue; // Invalid JSON? Try the next model!
            }
          }
          
          // If it's a 429 Rate Limit or 5xx Server Error, log it and try the next model
          const status = res.status;
          const errText = await res.text();
          console.warn(`⚠️ Model ${model} failed with ${status} using key ${key.substring(0, 8)}...`);
          lastError = `Status ${status} on ${model} (Key ending in ${key.slice(-4)})`;
          
        } catch (err) {
          console.warn(`⚠️ Fetch failed for ${model}: ${err.message}`);
          lastError = err.message;
        }
      }
    }
    
    throw new Error(`All AI models and API keys failed or rate-limited. Last error: ${lastError}`);
  };

  // 1. Analyze the user's intent and extract search keywords
  const extractionPrompt = `You are 'Smart L&F AI', an incredibly intelligent, highly perceptive, and empathetic autonomous agent for a Lost and Found system in Sri Lanka. You possess advanced deductive reasoning and act like a brilliant human assistant, not just a bot.
${userContextText}${historyText}The user just said: "${message}"

CRITICAL LANGUAGE RULE: 
- If the user typed in Singlish (Sinhala words written in English letters, e.g., "mage phone eka nathi una", "koheda thibbe"), you MUST reply in natural, friendly, colloquial Sri Lankan Singlish using English letters (e.g., "Ah, hari! Api poddak balamu eka meke thiyenawada kiyala", "Oya kiyana item eka nam labune na thama"). NEVER use the Sinhala alphabet script (අකුරු) for these users. Do not use overly formal words.
- If they typed in English, reply in English.
- If they typed in Sinhala script (අකුරු), reply in Sinhala script.

Determine their intent based on the context:
- "lost": They lost a specific item and want to search for it.
- "found": They found a specific item and want to search if someone reported it.
- "list_found": They want to see a general list of ALL currently found items.
- "list_lost": They want to see a general list of ALL currently lost items.
- "general": They are just saying hi, asking a general question, or making small talk.

Extract search keywords in English (e.g., color, brand, object type) ONLY if intent is 'lost' or 'found'. Look at the Conversation History to find missing context. Auto-correct spelling mistakes in keywords (e.g. "camra" -> "camera").

Return ONLY a valid JSON object exactly like this:
{
  "intent": "lost" | "found" | "list_found" | "list_lost" | "general",
  "keywords": ["array", "of", "english", "keywords"],
  "responseIfGeneral": "If intent is 'general', write a natural, friendly reply. MUST follow the CRITICAL LANGUAGE RULE.",
  "responseIfMissingKeywords": "If intent is 'lost' or 'found' but you cannot extract ANY keywords, ask them what exactly they lost/found. MUST follow the CRITICAL LANGUAGE RULE.",
  "responseIfNotFound": "If intent is 'lost' or 'found', draft a short response saying you couldn't find the item and they should report it using the provided Markdown link [Report Item](/dashboard/report-lost or found). MUST follow the CRITICAL LANGUAGE RULE.",
  "quickReplies": ["Provide 2 to 3 examples of what the USER might reply. For example, if you ask 'What color?', suggest 'Black', 'Silver', 'White'. NEVER put a question mark '?' in quick replies. These are buttons the user clicks to reply to YOU."]
}`;

  let extractData;
  try {
    extractData = await fetchFromAI(extractionPrompt, { type: 'json_object' });
  } catch (err) {
    return ApiResponse.ok({ text: `[System Error: API Connection Failed] ${err.message}` }).send(res);
  }

  const extractContent = extractData?.choices?.[0]?.message?.content;
  
  if (!extractContent) {
    console.error('Opencode returned an unexpected format:', JSON.stringify(extractData));
    return ApiResponse.ok({ text: `[System Error: API Connection Failed] Unexpected API response format. Check server logs.` }).send(res);
  }

  let analysis;
  try {
    analysis = parseJSONResponse(extractContent);
  } catch (err) {
    console.error('Failed to parse inner JSON content:', extractContent);
    // Graceful fallback: If AI completely ignored the JSON instruction and just replied naturally, 
    // we use its raw text as a general response instead of throwing an error!
    analysis = {
       intent: 'general',
       responseIfGeneral: extractContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(),
       quickReplies: ["I lost something", "I found something"]
    };
  }

  if (!analysis) {
    return ApiResponse.ok({ text: `I'm having trouble understanding. Could you rephrase?` }).send(res);
  }

  // Handle general chat immediately
  if (analysis.intent === 'general') {
    return ApiResponse.ok({ 
      text: analysis.responseIfGeneral || "How can I help you find or report an item today?",
      quickReplies: analysis.quickReplies || ["I lost something", "I found something"]
    }).send(res);
  }

  // Handle generic listings
  if (analysis.intent === 'list_found' || analysis.intent === 'list_lost') {
    const targetModel = analysis.intent === 'list_found' ? FoundItem : LostItem;
    const statusFilter = analysis.intent === 'list_found' ? { $in: ['available'] } : { $in: ['pending'] };
    const dbItems = await targetModel.find({ status: statusFilter }).sort({ createdAt: -1 }).limit(10).lean();

    if (dbItems.length === 0) {
      return ApiResponse.ok({ 
        text: analysis.responseIfNotFound || `No items currently reported. You can report one here:\n\n[Report a ${analysis.intent === 'list_found' ? 'Found' : 'Lost'} Item](/dashboard/report-${analysis.intent === 'list_found' ? 'found' : 'lost'})`,
        quickReplies: analysis.quickReplies || ["Report an item", "Go to Home"]
      }).send(res);
    }

    const linkPrefix = analysis.intent === 'list_found' ? '/found-items' : '/lost-items';
    const itemSummary = dbItems.map(item => `- [${item.itemName}](${linkPrefix}/${item._id})`).join('\n');
    
    const replyPrompt = `You are a super friendly Lost & Found AI.
${userContextText}${historyText}The user wants to see a list of ${analysis.intent === 'list_found' ? 'found' : 'lost'} items. We retrieved these recent items from the DB:
${itemSummary}

CRITICAL LANGUAGE RULE: 
- If the user typed in Singlish (Sinhala words written in English letters, e.g., "mage phone eka nathi una", "koheda thibbe"), you MUST reply in natural, friendly, colloquial Sri Lankan Singlish using English letters (e.g., "Ah, hari! Api poddak balamu eka meke thiyenawada kiyala", "Oya kiyana item eka nam labune na thama"). NEVER use the Sinhala alphabet script (අකුරු) for these users. Do not use overly formal words.
- If they typed in English, reply in English.
- If they typed in Sinhala script (අකුරු), reply in Sinhala script.

Return ONLY a valid JSON object:
{
  "text": "CRITICAL: Draft a natural, conversational reply presenting this list following the CRITICAL LANGUAGE RULE. Use emojis. Include the exact markdown links.",
  "quickReplies": ["Suggest 2 or 3 short follow-up actions (max 4 words) from the USER'S perspective (e.g., 'Search again', 'Go to Home'). DO NOT suggest questions."]
}`;

    let replyData;
    try {
      replyData = await fetchFromAI(replyPrompt, { type: 'json_object' });
    } catch (err) {
      console.error('Third fetchFromAI failed:', err.message);
    }
    
    let replyJson = null;
    try {
      const content = replyData?.choices?.[0]?.message?.content;
      if (content) {
        replyJson = parseJSONResponse(content);
      }
    } catch (err) {
      console.error('Failed to parse third AI response:', err.message);
    }
    const finalReply = replyJson?.text || "Here are the recent items:\n" + itemSummary;
    const quickReplies = replyJson?.quickReplies || ["Search again", "Report an item"];
    return ApiResponse.ok({ text: finalReply, quickReplies, items: dbItems }).send(res);
  }

  // Handle specific searches (lost / found)
  if (!analysis.keywords || analysis.keywords.length === 0) {
    return ApiResponse.ok({ 
      text: analysis.responseIfMissingKeywords || "Please specify what exactly you lost or found.",
      quickReplies: ["I lost a phone", "I found a wallet", "Cancel"]
    }).send(res);
  }

  const targetModel = analysis.intent === 'lost' ? FoundItem : LostItem;
  const statusFilter = analysis.intent === 'lost' ? { $in: ['available', 'matched'] } : { $in: ['pending', 'matched'] };

  // Escape regex characters
  const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexPatterns = analysis.keywords.map(kw => new RegExp(escapeRegex(kw), 'i'));
  const dbItems = await targetModel.find({
    status: statusFilter,
    $or: [
      { itemName: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
      { aiKeywords: { $in: regexPatterns } }
    ]
  }).limit(5).lean();

  if (dbItems.length === 0) {
    return ApiResponse.ok({ 
      text: analysis.responseIfNotFound || `I couldn't find that item. Please report it:\n\n[Report a ${analysis.intent === 'lost' ? 'Lost' : 'Found'} Item](/dashboard/report-${analysis.intent})`,
      quickReplies: analysis.quickReplies || [`Report ${analysis.intent === 'lost' ? 'Lost' : 'Found'} Item`, "Try another search"]
    }).send(res);
  }

  // 3. Let AI format the final response
  const linkPrefix = analysis.intent === 'lost' ? '/found-items' : '/lost-items';
  const itemSummary = dbItems.map(item => `- [${item.itemName}](${linkPrefix}/${item._id}) (Location: ${item.lostLocation || item.foundLocation})`).join('\n');
  
  const replyPrompt = `You are 'Smart L&F AI', an incredibly intelligent, perceptive, and highly empathetic autonomous agent. You possess advanced deductive reasoning and act like a brilliant human assistant.
${userContextText}${historyText}The user searched for: "${message}".
We found these matches in the DB:
${itemSummary}

IMPORTANT RULES:
1. Only list an item if it TRULY MATCHES what the user is looking for based on the keywords. Use your advanced deductive reasoning to figure out if an item is a plausible match.
2. If NONE of the matches are truly relevant, DO NOT list them. Instead, express genuine empathy that you couldn't find it.
3. If you didn't find the item, give them this EXACT Markdown link to report it: "[Report a ${analysis.intent === 'lost' ? 'Lost' : 'Found'} Item](/dashboard/report-${analysis.intent})"
4. If there are matches but you feel the user's initial description was very vague (e.g., they just said "laptop" or "wallet"), you should STILL suggest the top matches, BUT also proactively and politely ask a context-specific follow-up question tailored to the item type. For example, if they lost a laptop, ask about the brand (HP, Dell, Apple), color, or if it had any stickers. If they lost a phone, ask about the model or phone cover.
5. Show empathy. If they lost something, briefly acknowledge the stress of losing it. If they found something, praise them for their honesty. This makes you feel human and incredibly intelligent.

CRITICAL LANGUAGE RULE: 
- If the user typed in Singlish (Sinhala words written in English letters, e.g., "mage phone eka nathi una", "koheda thibbe"), you MUST reply in natural, friendly, colloquial Sri Lankan Singlish using English letters (e.g., "Ah, hari! Api poddak balamu eka meke thiyenawada kiyala", "Oya kiyana item eka nam labune na thama"). NEVER use the Sinhala alphabet script (අකුරු) for these users. Do not use overly formal words.
- If they typed in English, reply in English.
- If they typed in Sinhala script (අකුරු), reply in Sinhala script.

Return ONLY a valid JSON object:
{
  "text": "CRITICAL: Draft a friendly, natural reply following the CRITICAL LANGUAGE RULE. If there are relevant items, include their markdown links exactly as provided. Use emojis!",
  "quickReplies": ["Suggest 2 or 3 short follow-up actions (max 4 words) from the USER'S perspective (e.g., 'Search again', 'Report item'). DO NOT suggest questions."]
}`;

  let replyData;
  try {
    replyData = await fetchFromAI(replyPrompt, { type: 'json_object' });
  } catch (err) {
    console.error('Second fetchFromAI failed:', err.message);
  }

  let replyJson = null;
  try {
    const content = replyData?.choices?.[0]?.message?.content;
    if (content) {
      replyJson = parseJSONResponse(content);
    }
  } catch (err) {
    console.error('Failed to parse second AI response:', err.message);
  }
  
  const finalReply = replyJson?.text || "Here are some matches I found:\n" + itemSummary;
  const quickReplies = replyJson?.quickReplies || ["Search again", "Report item"];

  return ApiResponse.ok({ text: finalReply, quickReplies, items: dbItems }).send(res);
});
