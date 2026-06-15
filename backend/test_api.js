import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch'; // Requires node-fetch if Node < 18, but Node 25 has native fetch
import https from 'https';

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => resolve());
    }).on('error', reject);
  });
}

async function testLiveEndpoint() {
  console.log('Downloading test image...');
  await downloadImage('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 'test.jpg');
  
  // Need to get a valid token. Since I don't have one, I will test the local backend instead.
  // Oh wait, /api/ai/suggest-details is protected by 'protect' middleware.
  // So the token IS required. 
  
  console.log('Test image downloaded.');
}

testLiveEndpoint().catch(console.error);
