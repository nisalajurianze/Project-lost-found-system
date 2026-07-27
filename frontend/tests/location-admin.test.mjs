import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');
test('admin location queue exposes human approval, sensitivity and version context', () => {
  const page = read('src/pages/admin/LocationKnowledge.jsx');
  assert.match(page, /location\.reviewSubtitle/);
  assert.match(page, /university-approved/);
  assert.match(page, /field-verified/);
  assert.match(page, /sensitivity/);
  assert.match(page, /common\.version/);
});
