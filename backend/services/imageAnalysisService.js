// ============================================
// Image Analysis Service
// Uses OpenAI Vision, Gemini Vision, or Rule-based Fallback
// ============================================

import ImageAnalysis from '../models/ImageAnalysis.js';

const parseJSONResponse = (text) => {
  try {
    // Extract the first valid JSON object using regex, ignoring surrounding conversational text
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in response');
    return JSON.parse(match[0]);
  } catch (error) {
    console.error('❌ Failed to parse AI JSON response:', error.message);
    return null;
  }
};

/**
 * Smart rule-based fallback analysis if no AI keys are provided.
 * Analyzes item name and description to extract likely labels and colors.
 *
 * @param {string} itemName
 * @param {string} description
 * @returns {object} Analysis result
 */
const getFallbackAnalysis = (itemName = '', description = '') => {
  const combined = `${itemName} ${description}`.toLowerCase();
  
  // Basic colors list
  const colorList = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'grey', 'gray', 'silver', 'gold', 'brown', 'pink', 'purple', 'orange'];
  const colors = colorList.filter(color => combined.includes(color));

  // Basic categories / labels extraction
  const labelKeywords = {
    phone: ['phone', 'iphone', 'samsung', 'android', 'mobile', 'cellphone'],
    laptop: ['laptop', 'macbook', 'dell', 'hp', 'lenovo', 'computer', 'asus'],
    keys: ['key', 'keys', 'keychain'],
    wallet: ['wallet', 'purse', 'cardholder', 'billfold'],
    watch: ['watch', 'smartwatch', 'applewatch', 'rolex', 'casio'],
    bag: ['bag', 'backpack', 'handbag', 'suitcase', 'briefcase'],
    charger: ['charger', 'cable', 'adapter', 'powerbank', 'wire'],
    headphones: ['headphones', 'earbuds', 'airpods', 'headset'],
    clothing: ['jacket', 'coat', 'shirt', 'cap', 'hat', 'hoodie', 'sweater', 'shoe', 'shoes'],
    documents: ['id card', 'student card', 'passport', 'license', 'book', 'notebook', 'document']
  };

  const labels = [];
  // Add item name words as labels
  itemName.toLowerCase().split(/\s+/).forEach(word => {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 2 && !['and', 'for', 'with', 'lost', 'found'].includes(cleanWord)) {
      labels.push(cleanWord);
    }
  });

  // Check matching keyword groups
  Object.entries(labelKeywords).forEach(([label, keywords]) => {
    if (keywords.some(keyword => combined.includes(keyword))) {
      if (!labels.includes(label)) {
        labels.push(label);
      }
    }
  });

  // Default labels if empty
  if (labels.length === 0) {
    labels.push('item', 'personal object');
  }

  // Capitalize labels and colors
  const finalLabels = labels.map(l => l.charAt(0).toUpperCase() + l.slice(1));
  const finalColors = colors.map(c => c.charAt(0).toUpperCase() + c.slice(1));

  return {
    labels: finalLabels,
    colors: finalColors.length > 0 ? finalColors : ['Unknown'],
    description: `Rule-based analysis for: ${itemName}. ${description.substring(0, 100)}`,
    confidence: 70,
    provider: 'fallback'
  };
};

/**
 * Analyze an item image using OpenRouter.
 */
const analyzeWithOpenRouter = async (imageUrl, apiKey) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'Smart Lost and Found'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this lost/found item image. Return a JSON object with strictly these fields: "labels" (array of strings, ALWAYS lowercase, separate brand names from generic items, e.g. ["iphone 13 pro", "apple", "smartphone", "cracked screen"]), "colors" (array of strings, ALWAYS lowercase, e.g. ["space grey", "black"]), "description" (a highly detailed 1-2 sentence description including unique visual features, brands, or damage), and "confidence" (number 0-100 representing how confident you are). Do not wrap the JSON in markdown blocks.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API responded with ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = parseJSONResponse(content);
    
    if (result) {
      return {
        ...result,
        provider: 'openrouter',
        rawResponse: data
      };
    }
    return null;
  } catch (error) {
    console.error('❌ OpenRouter Image Analysis failed:', error.message);
    return null;
  }
};

/**
 * Analyze an item image and persist the results.
 * Falls back gracefully to rule-based fallback if APIs fail or keys are missing.
 *
 * @param {string} itemType - 'LostItem' or 'FoundItem'
 * @param {string} itemId - Mongoose ObjectId
 * @param {string} imageUrl - URL of the image
 * @param {string} itemName - Fallback item name
 * @param {string} description - Fallback description
 * @returns {Promise<ImageAnalysis>} Saved ImageAnalysis document
 */
const analyzeItemImage = async (itemType, itemId, imageUrl, itemName = '', description = '') => {
  const { OPENROUTER_API_KEY } = process.env;
  let analysis = null;

  // 1. Try OpenRouter if configured
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'your_openrouter_api_key' && !imageUrl.startsWith('data:')) {
    console.log(`🤖 Analyzing image for ${itemType} (${itemId}) using OpenRouter (nex-n2-pro)...`);
    analysis = await analyzeWithOpenRouter(imageUrl, OPENROUTER_API_KEY);
  }

  // 2. Fallback if API failed or was not configured
  if (!analysis) {
    console.log(`ℹ️ Using rule-based fallback analysis for ${itemType} (${itemId})...`);
    analysis = getFallbackAnalysis(itemName, description);
  }

  // Save analysis to database using upsert to prevent duplicates
  const savedAnalysis = await ImageAnalysis.findOneAndUpdate(
    { itemId, itemType },
    {
      imageUrl,
      labels: analysis.labels || [],
      colors: analysis.colors || [],
      description: analysis.description || '',
      confidence: analysis.confidence || 0,
      provider: analysis.provider || 'fallback',
      rawResponse: analysis.rawResponse || null
    },
    { new: true, upsert: true }
  );

  console.log(`✅ Image analysis completed and saved for ${itemType} (${itemId}). Provider: ${savedAnalysis.provider}`);
  return savedAnalysis;
};

/**
 * Generate an icon and description for a newly suggested category using AI.
 * Falls back to generic defaults if APIs are unavailable or fail.
 *
 * @param {string} categoryName - The name of the category
 * @returns {Promise<{icon: string, description: string}>}
 */
const generateCategoryDetails = async (categoryName) => {
  const { OPENROUTER_API_KEY } = process.env;
  
  const systemPrompt = `You are an AI for a Lost and Found system. A user suggested a new category named "${categoryName}". Return ONLY a valid JSON object with fields: "icon" (a single relevant emoji) and "description" (a concise 1-sentence description of items belonging here). Example: {"icon":"🛹","description":"Skateboards and accessories."}`;

  // 1. Try OpenRouter
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'your_openrouter_api_key') {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
          'X-Title': 'Smart Lost and Found'
        },
        body: JSON.stringify({
          model: 'nex-agi/nex-n2-pro:free',
          messages: [{ role: 'user', content: systemPrompt }],
          response_format: { type: 'json_object' }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const result = parseJSONResponse(content);
        if (result && result.icon && result.description) return result;
      }
    } catch (e) {
      console.error('OpenRouter category generation failed:', e.message);
    }
  }

  // 2. Generic fallback
  return {
    icon: '📦',
    description: `Items related to ${categoryName}.`
  };
};

/**
 * Auto-suggests item details from an image for frontend form auto-fill.
 */
const suggestDetailsFromImage = async (imageUrl) => {
  const { OPENROUTER_API_KEY } = process.env;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key') {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }

  const systemPrompt = `You are an AI assistant helping a user fill out a Lost and Found report. 
First, evaluate if this image is a valid physical object that could be lost or found. If the image is a human face/selfie, a meme, completely blank, explicit/NSFW, or otherwise clearly not an object, you must flag it as spam.

Return ONLY a valid JSON object with these exact fields:
- "isSpam": Boolean (true if the image is a selfie, meme, explicit, or blank, false otherwise).
- "itemName": A concise title (max 5 words, e.g. "Apple iPhone 13 Pro Black"). If isSpam is true, leave empty.
- "category": The most appropriate category (e.g. "Electronics", "Wallets", "Keys", "Bags", "Clothing", "Documents", "Other"). If isSpam is true, leave empty.
- "description": A short descriptive paragraph suitable for a lost/found report. If isSpam is true, write a reason why it was rejected.
- "tags": A comma-separated string of 3 to 5 search keywords. If isSpam is true, leave empty.`;

  // Models ranked by vision capability and JSON reliability
  const models = [
    'meta-llama/llama-3.2-11b-vision-instruct:free', // Fast & reliable free vision model
    'google/gemini-2.0-pro-exp-02-05:free',          // Highly accurate fallback
    'nvidia/nemotron-nano-12b-v2-vl:free',           // Alternative vision fallback
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`🤖 Trying AI model: ${model}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
          'X-Title': 'Smart Lost and Found'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const result = parseJSONResponse(content);
        if (result && (result.itemName || result.isSpam)) {
          console.log(`✅ AI suggestion success with ${model}`);
          return result;
        }
        console.warn(`⚠️ ${model} returned invalid JSON, trying next...`);
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ ${model} failed (${response.status}), trying next...`);
        lastError = new Error(`${model} returned ${response.status}: ${errorText.substring(0, 200)}`);
      }
    } catch (err) {
      console.warn(`⚠️ ${model} error: ${err.message}, trying next...`);
      lastError = err;
    }
  }

  // All models failed
  throw lastError || new Error('All AI models failed to generate suggestions.');
};

/**
 * Generates searchable English keywords from an item's name and description.
 * Capable of translating from Sinhala, Tamil, or Singlish to English.
 */
const generateKeywordsFromText = async (itemName, description) => {
  const { OPENROUTER_API_KEY } = process.env;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key') {
    return [];
  }

  const systemPrompt = `You are a translation and keyword extraction assistant. 
A user has reported a lost or found item. The item name is "${itemName}" and the description is "${description}".
The text might be in English, Sinhala, Tamil, or Singlish (Sinhala written in English letters, e.g. "mage phone eka nathi wuna", "kalu pata kudayak").

Your task:
1. Understand the language and translate the meaning into English.
2. Extract 5-10 highly relevant search keywords in English (e.g., color, brand, item type, unique features).

Return ONLY a valid JSON object with the field "keywords" containing an array of lowercase strings. Example: {"keywords": ["iphone 13", "black", "apple", "smartphone", "cracked screen"]}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'Smart Lost and Found'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const result = parseJSONResponse(content);
      if (result && Array.isArray(result.keywords)) {
        return result.keywords;
      }
    }
  } catch (error) {
    console.error('Keyword generation failed:', error.message);
  }
  return [];
};

export {
  analyzeItemImage,
  generateCategoryDetails,
  suggestDetailsFromImage,
  generateKeywordsFromText,
  // Export these for testing if needed
  parseJSONResponse
};
