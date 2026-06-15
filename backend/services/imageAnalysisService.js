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
        model: 'nex-agi/nex-n2-pro:free',
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

  const systemPrompt = `You are an AI assistant helping a user fill out a Lost and Found report. 
Look at the image provided and return ONLY a valid JSON object with these exact fields:
- "itemName": A concise title (max 5 words, e.g. "Apple iPhone 13 Pro Black").
- "category": The most appropriate category (e.g. "Electronics", "Wallets", "Keys", "Bags", "Clothing", "Documents", "Other").
- "description": A short descriptive paragraph suitable for a lost/found report (include visible brands, colors, unique marks, or damage).`;

  try {
    if (OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'your_openrouter_api_key') {
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
        if (result && result.itemName) return result;
      }
    }
  } catch (error) {
    console.error('AI Suggestion Error:', error);
  }

  return {
    itemName: '',
    category: '',
    description: ''
  };
};

export {
  analyzeItemImage,
  generateCategoryDetails,
  suggestDetailsFromImage,
  // Export these for testing if needed
  parseJSONResponse
};
