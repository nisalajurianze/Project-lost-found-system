import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('unified public search supports lost found both filters counts chips and view modes', () => {
  const source = read('src/pages/public/SearchItems.jsx');
  assert.match(source, /value="both"/);
  assert.match(source, /lostItemService\.getLostItems/);
  assert.match(source, /foundItemService\.getFoundItems/);
  assert.match(source, /pagination\?\.totalDocs/);
  assert.match(source, /activeFilters/);
  assert.match(source, /setView\('grid'\)/);
  assert.match(source, /setView\('list'\)/);
  assert.match(source, /search\.loadMore/);
});

test('item card avoids nested interactive controls and exposes a clear detail action', () => {
  const source = read('src/components/cards/ItemCard.jsx');
  assert.match(source, /<article/);
  assert.match(source, /search\.viewDetails/);
  assert.match(source, /loading="lazy"/);
  assert.doesNotMatch(source, /<Link[\s\S]*<Button[\s\S]*<\/Link>/);
});
