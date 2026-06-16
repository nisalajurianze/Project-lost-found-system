
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'https://project-lost-found-system-production.up.railway.app/api';
// const BASE_URL = 'http://localhost:5000/api';

async function test() {
  console.log('1. Logging in to get token...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_ai_user@example.com', password: 'Password123!' })
  });

  if (loginRes.status === 401 || loginRes.status === 404) {
    console.log('User not found. Registering...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fullName: 'Test AI User', 
        email: 'test_ai_user@example.com', 
        password: 'Password123!',
        studentId: '123456789V'
      })
    });
    const regData = await regRes.json();
    console.log('Register response:', regData);
  }

  const loginRes2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_ai_user@example.com', password: 'Password123!' })
  });
  
  const loginData = await loginRes2.json();
  const token = loginData.data?.accessToken;
  
  if (!token) {
    console.error('Failed to get token:', loginData);
    return;
  }
  
  console.log('2. Got token. Testing AI endpoint...');
  
  const formData = new FormData();
  formData.append('image', fs.createReadStream('test.jpg'));

  const aiRes = await fetch(`${BASE_URL}/ai/suggest-details`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  console.log('AI Response status:', aiRes.status);
  const aiData = await aiRes.text();
  console.log('AI Response data:', aiData);
}

test().catch(console.error);
