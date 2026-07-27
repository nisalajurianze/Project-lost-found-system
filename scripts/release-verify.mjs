import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.tmp', 'tmp', '_renders']);
const sourceExtensions = new Set(['.js', '.jsx', '.mjs']);
const textExtensions = new Set(['.js', '.jsx', '.mjs', '.json', '.md', '.yml', '.yaml', '.html', '.css', '.env', '.example', '.txt', '.csv']);
const files = [];
const errors = [];
const relative = (value) => path.relative(root, value).replaceAll(path.sep, '/');

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      errors.push(`${relative(absolute)}: symlink must not ship`);
      continue;
    }
    if (entry.isDirectory()) walk(absolute);
    else files.push(absolute);
  }
};
walk(root);

const disallowedNames = new Set([
  'dummy.jpg', 'live_html.txt', 'old_navbar.jsx', 'temp_log.txt', 'test_axios.html',
  'test_build.js', 'test_img.png', 'test-ai.js', 'test_api.js', 'test.jpg',
]);

for (const file of files) {
  const rel = relative(file);
  const basename = path.basename(file);
  if (disallowedNames.has(basename)) errors.push(`${rel}: development artifact must not ship`);
  if ((basename === '.env' || basename.startsWith('.env.')) && basename !== '.env.example') {
    errors.push(`${rel}: populated or environment-specific file must not ship`);
  }

  if (path.extname(file) === '.json') {
    try { JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { errors.push(`${rel}: invalid JSON (${error.message})`); }
  }

  if (!textExtensions.has(path.extname(file)) && !file.endsWith('.env.example')) continue;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }

  const secretPatterns = [
    ['private key', /BEGIN (?:RSA|EC|OPENSSH|PRIVATE) PRIVATE KEY/],
    ['generic API secret', /\bsk-[A-Za-z0-9_-]{20,}\b/],
    ['Google API key', /\bAIza[0-9A-Za-z_-]{25,}\b/],
    ['credentialed MongoDB URI', /mongodb(?:\+srv)?:\/\/[^\s"']+:[^\s"']+@/],
    ['known development credential', /Admin@123|AdminPassword123|Password123|test_ai_user/i],
    ['browser auth token persistence', /localStorage\.(?:setItem|getItem)[^\n]*(?:accessToken|refreshToken|token|user)/i],
  ];
  if (rel !== 'scripts/release-verify.mjs') {
    for (const [label, pattern] of secretPatterns) {
      if (pattern.test(text)) errors.push(`${rel}: ${label} pattern detected`);
    }
  }

  if (!sourceExtensions.has(path.extname(file))) continue;
  const importSource = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const importPattern = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\1/g;
  for (const match of importSource.matchAll(importPattern)) {
    const specifier = match[2].split('?')[0].split('#')[0];
    const base = path.resolve(path.dirname(file), specifier);
    const candidates = path.extname(base)
      ? [base]
      : [base, ...['.js', '.jsx', '.mjs', '.json'].map((extension) => `${base}${extension}`), ...['index.js', 'index.jsx', 'index.mjs'].map((name) => path.join(base, name))];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      errors.push(`${rel}: missing relative import ${specifier}`);
    }
  }
}

if (errors.length) {
  console.error(`Release verification failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release verification passed: ${files.length} packaged-source files checked; JSON, imports, secret patterns, symlinks and release hygiene are clean.`);
