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
  const { message, history = [] } = req.body;
  if (!message) return ApiResponse.ok({ text: "Please say something!" }).send(res);

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
      const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
    
    // Array of reliable free models to try sequentially (DeepSeek added for extreme stability!)
    const modelsToTry = [
      process.env.AI_CHAT_MODEL || 'deepseek/deepseek-chat:free',
      'deepseek/deepseek-r1:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-2-9b-it:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free'
    ];

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
          const res = await fetch(primaryUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
              'X-Title': 'Smart Lost and Found'
            },
            body: JSON.stringify(reqBody)
          });
          
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
  const extractionPrompt = `You are a highly intelligent, conversational, and friendly AI assistant for a Lost and Found system in Sri Lanka. You speak fluent Singlish, Sinhala, and English.
${historyText}The user just said: "${message}"

Determine their intent based on the context:
- "lost": They lost a specific item and want to search for it.
- "found": They found a specific item and want to search if someone reported it.
- "list_found": They want to see a general list of ALL currently found items.
- "list_lost": They want to see a general list of ALL currently lost items.
- "general": They are just saying hi, asking a general question, or making small talk.

Extract search keywords in English (e.g., color, brand, object type) ONLY if intent is 'lost' or 'found'. Look at the Conversation History to find missing context (e.g., if they previously said "I lost my bike" and now say "it is black", the keywords are ["black", "bike"]).

Return ONLY a valid JSON object exactly like this:
{
  "intent": "lost" | "found" | "list_found" | "list_lost" | "general",
  "keywords": ["array", "of", "english", "keywords"],
  "responseIfGeneral": "If intent is 'general', write a natural, super friendly reply in the exact language the user used. Answer their question directly! If intent is not general, leave empty.",
  "quickReplies": ["Suggest 2 or 3 short follow-up actions/questions the user can click next (max 4 words each). Example: 'Report my item', 'Search again'"]
}`;

  let extractData;
  try {
    extractData = await fetchFromAI(extractionPrompt, { type: 'json_object' });
  } catch (err) {
    return ApiResponse.ok({ text: `[System Error: API Connection Failed] ${err.message}` }).send(res);
  }

  const extractContent = extractData?.choices?.[0]?.message?.content;
  const analysis = parseJSONResponse(extractContent);

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
        text: `Danata ${analysis.intent === 'list_found' ? 'hambawela' : 'nathi wela'} thiyena ewa monawath na. (No items currently reported).`,
        quickReplies: analysis.quickReplies || ["Report an item", "Go to Home"]
      }).send(res);
    }

    const linkPrefix = analysis.intent === 'list_found' ? '/found-items' : '/lost-items';
    const itemSummary = dbItems.map(item => `- [${item.itemName}](${linkPrefix}/${item._id})`).join('\n');
    
    const replyPrompt = `You are a super friendly Lost & Found AI.
${historyText}The user wants to see a list of ${analysis.intent === 'list_found' ? 'found' : 'lost'} items. We retrieved these recent items from the DB:
${itemSummary}

Return ONLY a valid JSON object:
{
  "text": "A natural, conversational reply in the user's language presenting this list. Use emojis. Include the exact markdown links.",
  "quickReplies": ["Suggest 2 or 3 short follow-up actions (max 4 words)"]
}`;

    const replyData = await fetchFromAI(replyPrompt, { type: 'json_object' });
    const replyJson = parseJSONResponse(replyData?.choices?.[0]?.message?.content);
    const finalReply = replyJson?.text || "Here are the recent items:\n" + itemSummary;
    const quickReplies = replyJson?.quickReplies || ["Search again", "Report an item"];
    return ApiResponse.ok({ text: finalReply, quickReplies, items: dbItems }).send(res);
  }

  // Handle specific searches (lost / found)
  if (!analysis.keywords || analysis.keywords.length === 0) {
    return ApiResponse.ok({ 
      text: "Monawada nathi une kiyala hariyatama kiyanna puluwanda? (Please specify what you lost or found).",
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
      text: `Mata oyaa kiyana jathiye ekak hoyaganna bari wuna. Puluwannam aluthen report ekak danna:\n\n[Report a ${analysis.intent === 'lost' ? 'Lost' : 'Found'} Item](/report-${analysis.intent})`,
      quickReplies: [`Report ${analysis.intent === 'lost' ? 'Lost' : 'Found'} Item`, "Try another search"]
    }).send(res);
  }

  // 3. Let AI format the final response
  const linkPrefix = analysis.intent === 'lost' ? '/found-items' : '/lost-items';
  const itemSummary = dbItems.map(item => `- [${item.itemName}](${linkPrefix}/${item._id}) (Location: ${item.lostLocation || item.foundLocation})`).join('\n');
  
  const replyPrompt = `You are a super friendly, intelligent AI assistant.
${historyText}The user searched for: "${message}".
We found these matches in the DB:
${itemSummary}

IMPORTANT RULES:
1. Only list an item if it TRULY MATCHES what the user is looking for (e.g., if they want a bike, do not show a laptop just because both are black). 
2. If NONE of the matches are truly relevant, DO NOT list them. Instead, say you couldn't find any.
3. If you didn't find the item, give them this EXACT Markdown link to report it: "[Report a ${analysis.intent === 'lost' ? 'Lost' : 'Found'} Item](/report-${analysis.intent})"

Return ONLY a valid JSON object:
{
  "text": "Draft a friendly, natural reply in the SAME LANGUAGE the user used. If there are relevant items, include their markdown links exactly as provided. Use emojis!",
  "quickReplies": ["Suggest 2 or 3 short follow-up actions (max 4 words)"]
}`;

  const replyData = await fetchFromAI(replyPrompt, { type: 'json_object' });
  const replyJson = parseJSONResponse(replyData?.choices?.[0]?.message?.content);
  
  const finalReply = replyJson?.text || "Here are some matches I found:\n" + itemSummary;
  const quickReplies = replyJson?.quickReplies || ["Search again", "Report item"];

  return ApiResponse.ok({ text: finalReply, quickReplies, items: dbItems }).send(res);
});
