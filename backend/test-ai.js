import dotenv from 'dotenv';
dotenv.config();

async function testAI() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if(!apiKey) { 
      console.log('NO API KEY FOUND in .env'); 
      return; 
    }
    
    console.log('Testing OpenRouter connection with nex-n2-pro...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Smart Lost and Found'
      },
      body: JSON.stringify({
        model: 'nex-agi/nex-n2-pro:free',
        messages: [{ role: 'user', content: 'Provide a JSON object containing two fields: "icon" (a single relevant emoji) and "description" (a very short 1-sentence description of what items belong in this category) for a "Skateboard" category. Return ONLY valid JSON.' }],
        response_format: { type: 'json_object' }
      })
    });
    
    if(!response.ok) {
      console.log('Error:', response.status, await response.text());
      return;
    }
    const data = await response.json();
    console.log('✅ SUCCESS! Response from AI:');
    console.log(data.choices[0].message.content);
  } catch (e) {
    console.log('❌ Failed:', e);
  }
}

testAI();
