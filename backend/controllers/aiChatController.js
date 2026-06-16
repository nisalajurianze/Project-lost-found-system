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
  const { message } = req.body;
  if (!message) return ApiResponse.ok({ text: "Please say something!" }).send(res);

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const PRIMARY_KEY = process.env.AI_API_KEY || OPENROUTER_KEY;

  if (!PRIMARY_KEY || PRIMARY_KEY === 'your_openrouter_api_key') {
    return ApiResponse.ok({ text: "AI is currently unavailable. Please use the manual search." }).send(res);
  }

  // Helper to make AI calls with automatic fallback to OpenRouter
  const fetchFromAI = async (prompt, format = null) => {
    const primaryUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    const primaryModel = process.env.AI_CHAT_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

    const fallbackUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const fallbackModel = 'meta-llama/llama-3.3-70b-instruct:free';

    const reqBody = {
      model: primaryModel,
      messages: [{ role: 'user', content: prompt }]
    };
    if (format) reqBody.response_format = format;

    try {
      // 1. Try Primary Provider (e.g., Opencode DeepSeek)
      const res = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PRIMARY_KEY}` },
        body: JSON.stringify(reqBody)
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('Primary Provider returned non-JSON:', text);
          throw new Error('Invalid JSON from Primary Provider');
        }
      }
      const errText = await res.text();
      console.error(`Primary Provider Failed: ${res.status} - ${errText}`);
      throw new Error(`Primary Provider Failed: ${res.status}`);
    } catch (err) {
      console.warn(`⚠️ AI Primary Provider Failed (${err.message}). Falling back to OpenRouter...`);
      
      // 2. Try Fallback Provider (OpenRouter Llama)
      if (OPENROUTER_KEY && OPENROUTER_KEY !== 'your_openrouter_api_key') {
        reqBody.model = fallbackModel;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}` },
          body: JSON.stringify(reqBody)
        });
        if (fallbackRes.ok) {
          const text = await fallbackRes.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error(`Fallback Provider returned non-JSON: ${text}`);
          }
        } else {
          const errText = await fallbackRes.text();
          throw new Error(`Fallback Provider Failed: ${fallbackRes.status} - ${errText}`);
        }
      }
      throw new Error(`Primary API Failed and no Fallback API key provided. Details: ${err.message}`);
    }
  };

  // 1. Analyze the user's intent and extract search keywords
  const extractionPrompt = `You are an AI assistant for a Lost and Found system. 
The user said: "${message}" (They might speak in English, Sinhala, Tamil, or Singlish).
Determine their intent (are they looking for something they "lost", or did they "find" something?).
Extract search keywords in English (e.g., color, brand, object type).

Return ONLY a valid JSON object:
{
  "intent": "lost" or "found" or "general",
  "keywords": ["array", "of", "english", "keywords"],
  "responseIfGeneral": "If intent is general, put a friendly reply here, else empty"
}`;

  let extractData;
  try {
    extractData = await fetchFromAI(extractionPrompt);
  } catch (err) {
    return ApiResponse.ok({ text: `[System Error: API Connection Failed] ${err.message}` }).send(res);
  }

  const extractContent = extractData?.choices?.[0]?.message?.content;
  const analysis = parseJSONResponse(extractContent);

  if (!analysis) {
    return ApiResponse.ok({ text: `I'm having trouble understanding. (Error: AI returned invalid format. Raw: ${extractContent?.substring(0, 50)}...). Could you rephrase?` }).send(res);
  }

  if (analysis.intent === 'general' || !analysis.keywords || analysis.keywords.length === 0) {
    return ApiResponse.ok({ text: analysis.responseIfGeneral || "How can I help you find or report an item today?" }).send(res);
  }

  // 2. Query the DB based on keywords
  const targetModel = analysis.intent === 'lost' ? FoundItem : LostItem;
  const statusFilter = analysis.intent === 'lost' ? { $in: ['available', 'matched'] } : { $in: ['pending', 'matched'] };

  // Build an OR query: regex match on itemName, description, or aiKeywords
  // Escape regex characters to prevent ReDoS/crashes
  const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
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
    return ApiResponse.ok({ text: `I couldn't find any ${analysis.intent === 'lost' ? 'found' : 'lost'} items matching your description. I recommend submitting a formal report so we can notify you if it turns up!` }).send(res);
  }

  // 3. Let AI format the final response
  const linkPrefix = analysis.intent === 'lost' ? '/found-items' : '/lost-items';
  const itemSummary = dbItems.map(item => `- [${item.itemName}](${linkPrefix}/${item._id}) (Location: ${item.lostLocation || item.foundLocation})`).join('\n');
  
  const replyPrompt = `You are a helpful Lost & Found AI. The user asked: "${message}".
We searched the database and found these potential matches:
${itemSummary}

Draft a friendly, concise response in the SAME LANGUAGE the user used (e.g. if they used Singlish, reply in Singlish or English. If Sinhala, reply in Sinhala). Make sure to include the markdown links to the items exactly as provided.`;

  const replyData = await fetchFromAI(replyPrompt);
  const finalReply = replyData?.choices?.[0]?.message?.content || "Here are some matches I found:\n" + itemSummary;

  return ApiResponse.ok({ text: finalReply, items: dbItems }).send(res);
});
