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
  if (!message) return ApiResponse.success({ text: "Please say something!" }).send(res);

  const { OPENROUTER_API_KEY } = process.env;
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key') {
    return ApiResponse.success({ text: "AI is currently unavailable. Please use the manual search." }).send(res);
  }

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

  const extractRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: 'nex-agi/nex-n2-pro:free',
      messages: [{ role: 'user', content: extractionPrompt }],
      response_format: { type: 'json_object' }
    })
  });

  const extractData = await extractRes.json();
  const extractContent = extractData.choices?.[0]?.message?.content;
  const analysis = parseJSONResponse(extractContent);

  if (!analysis) {
    return ApiResponse.success({ text: "I'm having trouble understanding. Could you rephrase?" }).send(res);
  }

  if (analysis.intent === 'general' || !analysis.keywords || analysis.keywords.length === 0) {
    return ApiResponse.success({ text: analysis.responseIfGeneral || "How can I help you find or report an item today?" }).send(res);
  }

  // 2. Query the DB based on keywords
  // If user LOST something, we search FOUND items. If user FOUND something, we search LOST items.
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
    return ApiResponse.success({ text: `I couldn't find any ${analysis.intent === 'lost' ? 'found' : 'lost'} items matching your description. I recommend submitting a formal report so we can notify you if it turns up!` }).send(res);
  }

  // 3. Let AI format the final response
  const linkPrefix = analysis.intent === 'lost' ? '/found-items' : '/lost-items';
  const itemSummary = dbItems.map(item => `- [${item.itemName}](${linkPrefix}/${item._id}) (Location: ${item.lostLocation || item.foundLocation})`).join('\n');
  
  const replyPrompt = `You are a helpful Lost & Found AI. The user asked: "${message}".
We searched the database and found these potential matches:
${itemSummary}

Draft a friendly, concise response in the SAME LANGUAGE the user used (e.g. if they used Singlish, reply in Singlish or English. If Sinhala, reply in Sinhala). Make sure to include the markdown links to the items exactly as provided.`;

  const replyRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: 'nex-agi/nex-n2-pro:free',
      messages: [{ role: 'user', content: replyPrompt }]
    })
  });

  const replyData = await replyRes.json();
  const finalReply = replyData.choices?.[0]?.message?.content || "Here are some matches I found:\n" + itemSummary;

  return ApiResponse.success({ text: finalReply, items: dbItems }).send(res);
});
