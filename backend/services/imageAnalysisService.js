// ============================================
// Image Analysis Service
// Uses OpenAI Vision, Gemini Vision, or Rule-based Fallback
// ============================================

import ImageAnalysis from '../models/ImageAnalysis.js';

/**
 * Clean up response string to parse JSON safely.
 */
const parseJSONResponse = (text) => {
  try {
    // Strip markdown JSON block if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText.trim());
  } catch (error) {
    console.error('❌ Failed to parse AI JSON response:', error);
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
 * Analyze an item image using OpenAI.
 */
const analyzeWithOpenAI = async (imageUrl, apiKey) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this lost/found item image. Return a JSON object with fields: "labels" (array of strings, e.g. ["Laptop", "MacBook"]), "colors" (array of strings, e.g. ["Silver", "Black"]), "description" (a concise 1-2 sentence description of the item) and "confidence" (number 0-100 representing how confident you are). Do not wrap the JSON in markdown blocks.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API responded with ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = parseJSONResponse(content);
    
    if (result) {
      return {
        ...result,
        provider: 'openai',
        rawResponse: data
      };
    }
    return null;
  } catch (error) {
    console.error('❌ OpenAI Image Analysis failed:', error.message);
    return null;
  }
};

/**
 * Analyze an item image using Gemini API (via HTTP request).
 */
const analyzeWithGemini = async (imageUrl, apiKey) => {
  try {
    // Fetch image data to send inline
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error('Failed to fetch image buffer for Gemini');
    const arrayBuffer = await imageRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Analyze this lost/found item image. Return ONLY a JSON object (no markdown, no ```json formatting) with fields: "labels" (array of strings), "colors" (array of strings), "description" (short 1-2 sentence description) and "confidence" (number 0-100).'
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API responded with ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = parseJSONResponse(text);

    if (result) {
      return {
        ...result,
        provider: 'gemini',
        rawResponse: data
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Gemini Image Analysis failed:', error.message);
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
  const { OPENAI_API_KEY, GEMINI_API_KEY } = process.env;
  let analysis = null;

  // 1. Try OpenAI if configured
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key' && !imageUrl.startsWith('data:')) {
    console.log(`🤖 Analyzing image for ${itemType} (${itemId}) using OpenAI...`);
    analysis = await analyzeWithOpenAI(imageUrl, OPENAI_API_KEY);
  }

  // 2. Try Gemini as secondary if OpenAI is missing or failed
  if (!analysis && GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key' && !imageUrl.startsWith('data:')) {
    console.log(`🤖 Analyzing image for ${itemType} (${itemId}) using Gemini...`);
    analysis = await analyzeWithGemini(imageUrl, GEMINI_API_KEY);
  }

  // 3. Fallback if no APIs succeeded or were configured
  if (!analysis) {
    console.log(`ℹ️ Using rule-based fallback analysis for ${itemType} (${itemId})...`);
    analysis = getFallbackAnalysis(itemName, description);
  }

  // Save analysis to database
  const savedAnalysis = await ImageAnalysis.create({
    itemType,
    itemId,
    imageUrl,
    labels: analysis.labels || [],
    colors: analysis.colors || [],
    description: analysis.description || '',
    confidence: analysis.confidence || 0,
    provider: analysis.provider || 'fallback',
    rawResponse: analysis.rawResponse || null
  });

  console.log(`✅ Image analysis completed and saved for ${itemType} (${itemId}). Provider: ${savedAnalysis.provider}`);
  return savedAnalysis;
};

export { analyzeItemImage };
