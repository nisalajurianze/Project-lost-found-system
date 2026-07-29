import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const srcRoot = path.join(frontendRoot, 'src');
const sourceFiles = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
};
walk(srcRoot);

const lucideImports = new Set();
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/gs;
  for (const match of source.matchAll(pattern)) {
    for (const raw of match[1].split(',')) {
      const imported = raw.trim().split(/\s+as\s+/i)[0]?.trim();
      if (imported) lucideImports.add(imported);
    }
  }
}

test('admin dashboard uses the canonical warning icon export', () => {
  const source = fs.readFileSync(path.join(srcRoot, 'pages/admin/AdminDashboard.jsx'), 'utf8');
  assert.doesNotMatch(source, /\bTriangleAlert\b/);
  assert.match(source, /\bAlertTriangle\b/);
});

test('Lucide dependency and lockfile use the audited compatible release', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package-lock.json'), 'utf8'));
  assert.equal(pkg.dependencies?.['lucide-react'], '0.545.0');
  assert.equal(lock.packages?.['']?.dependencies?.['lucide-react'], '0.545.0');
  assert.equal(lock.packages?.['node_modules/lucide-react']?.version, '0.545.0');
  assert.match(lock.packages?.['node_modules/lucide-react']?.integrity || '', /^sha512-/);
});

test('all named Lucide imports exist in the installed package', async (t) => {
  let lucide;
  try {
    lucide = await import('lucide-react');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      t.skip('Run after npm ci to verify installed Lucide exports.');
      return;
    }
    throw error;
  }
  const missing = [...lucideImports].filter((name) => !(name in lucide));
  assert.deepEqual(missing, []);
});

test('Vercel config proxies API and realtime polling before SPA routing', () => {
  const config = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'vercel.json'), 'utf8'));
  assert.deepEqual(config.rewrites?.slice(0, 3), [
    {
      source: '/api/:path*',
      destination: 'https://project-lost-found-system-production.up.railway.app/api/:path*',
    },
    {
      source: '/socket.io',
      destination: 'https://project-lost-found-system-production.up.railway.app/socket.io',
    },
    {
      source: '/socket.io/:path*',
      destination: 'https://project-lost-found-system-production.up.railway.app/socket.io/:path*',
    },
  ]);
  assert.equal(config.rewrites?.at(-1)?.destination, '/index.html');
  const names = new Set(config.headers?.flatMap((rule) => rule.headers || []).map((header) => header.key));
  for (const required of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.equal(names.has(required), true, `Missing ${required}`);
  }
  const permissions = config.headers.flatMap((rule) => rule.headers || []).find((header) => header.key === 'Permissions-Policy')?.value || '';
  assert.match(permissions, /microphone=\(self\)/);
  assert.match(permissions, /camera=\(self\)/);
});
