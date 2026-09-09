// Explicit, bounded live check. No database, uploads, user data, or config writes.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { requestAIJson } from '../services/aiProviderService.js';
import { generateCategoryDetails, suggestDetailsFromImage } from '../services/imageAnalysisService.js';

if (!process.argv.includes('--live')) throw new Error('Pass --live to authorize up to six free API requests.');
if (!process.env.OPENROUTER_API_KEY?.trim()) throw new Error('OPENROUTER_API_KEY is required.');
Object.assign(process.env, {
  AI_ENABLED: 'true', AI_CHAT_PROVIDER: 'openrouter', AI_VISION_PROVIDER: 'openrouter',
  AI_API_URL: 'https://opencode.ai/zen/v1/chat/completions',
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  // Use verified free models directly so the smoke also exercises failover,
  // rather than depending on the router's changing model selection.
  OPENROUTER_CHAT_MODEL: 'inclusionai/ling-3.0-flash-fin:free',
  OPENROUTER_CHAT_MODELS: 'inclusionai/ling-3.0-flash-fin:free,nex-agi/nex-n2.5-mini:free,google/gemma-4-31b-it:free',
  OPENROUTER_VISION_MODEL: 'google/gemma-4-31b-it:free',
  OPENROUTER_VISION_MODELS: 'google/gemma-4-31b-it:free,nex-agi/nex-n2.5-mini:free',
  AI_USE_RESPONSE_FORMAT: 'false', AI_TIMEOUT_MS: '25000', AI_MAX_ATTEMPTS: '2',
  AI_CATEGORY_TIMEOUT_MS: '15000', AI_CATEGORY_MAX_ATTEMPTS: '1',
});

// A blue square on white, constructed in memory. It is not an item photo.
const crc = (buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
};
const chunk = (name, data) => {
  const type = Buffer.from(name);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, checksum]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(96, 0); header.writeUInt32BE(96, 4); header[8] = 8; header[9] = 2;
const pixels = Buffer.alloc(96 * 289);
for (let y = 0; y < 96; y += 1) for (let x = 0; x < 96; x += 1) {
  const index = y * 289 + 1 + x * 3;
  const blue = x >= 24 && x < 72 && y >= 24 && y < 72;
  pixels[index] = blue ? 0 : 255; pixels[index + 1] = blue ? 0 : 255; pixels[index + 2] = 255;
}
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
const cases = [
  ['structured-text', async () => {
    const result = await requestAIJson([{ role: 'user', content: 'Return JSON only: {"reply":"ready"}.' }], { validator: (value) => value.reply === 'ready' });
    assert.equal(result.data.reply, 'ready');
  }],
  ['category', async () => {
    const result = await generateCategoryDetails('Microphone');
    assert.match(result.correctedName, /microphone/i);
    assert.ok(result.icon && result.icon !== '📦');
  }],
  ['non-item-image-rejection', async () => {
    const result = await suggestDetailsFromImage(`data:image/png;base64,${png.toString('base64')}`);
    assert.notEqual(result.moderationDecision, 'allow');
    assert.equal(result.isItemPhoto, false);
  }],
];
for (const [name, run] of cases) {
  try { await run(); console.log(JSON.stringify({ test: name, passed: true })); }
  catch (error) { console.log(JSON.stringify({ test: name, passed: false, code: error.code || error.name })); process.exitCode = 1; }
}
