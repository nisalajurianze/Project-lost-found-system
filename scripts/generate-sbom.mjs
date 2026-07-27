import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputs = path.join(root, 'docs', 'compliance');
const lockfiles = [
  { layer: 'backend', file: path.join(root, 'backend', 'package-lock.json') },
  { layer: 'frontend', file: path.join(root, 'frontend', 'package-lock.json') },
];

const componentMap = new Map();
const licenseCounts = new Map();
const unknownLicenses = [];

const packageNameFromKey = (key) => {
  const tail = key.split('node_modules/').at(-1);
  return tail || null;
};

for (const { layer, file } of lockfiles) {
  const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(lock.packages || {})) {
    if (!key || !value?.version) continue;
    const name = value.name || packageNameFromKey(key);
    if (!name) continue;
    const scope = value.dev ? 'optional' : 'required';
    const id = `${name}@${value.version}:${scope}`;
    const license = typeof value.license === 'string' ? value.license : 'UNKNOWN';
    licenseCounts.set(license, (licenseCounts.get(license) || 0) + 1);
    if (license === 'UNKNOWN') unknownLicenses.push({ layer, name, version: value.version });

    const existing = componentMap.get(id) || {
      type: 'library',
      name,
      version: value.version,
      scope,
      purl: `pkg:npm/${encodeURIComponent(name).replace('%40', '@')}@${value.version}`,
      licenses: [{ license: { id: license } }],
      properties: [],
      externalReferences: [],
    };
    const layerProperty = existing.properties.find((entry) => entry.name === 'smart-lf:layers');
    if (layerProperty) {
      const layers = new Set(layerProperty.value.split(','));
      layers.add(layer);
      layerProperty.value = [...layers].sort().join(',');
    } else {
      existing.properties.push({ name: 'smart-lf:layers', value: layer });
    }
    existing.properties.push({ name: `smart-lf:${layer}:development`, value: String(Boolean(value.dev)) });
    if (value.resolved && !existing.externalReferences.some((ref) => ref.url === value.resolved)) {
      existing.externalReferences.push({ type: 'distribution', url: value.resolved });
    }
    if (value.integrity) existing.properties.push({ name: `smart-lf:${layer}:npm-integrity`, value: value.integrity });
    componentMap.set(id, existing);
  }
}

const components = [...componentMap.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const generatedAt = new Date((Number(process.env.SOURCE_DATE_EPOCH) || Math.floor(Date.now() / 1000)) * 1000).toISOString();
const serialSeed = crypto.createHash('sha256').update(JSON.stringify(components)).digest('hex');
const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${serialSeed.slice(0, 8)}-${serialSeed.slice(8, 12)}-${serialSeed.slice(12, 16)}-${serialSeed.slice(16, 20)}-${serialSeed.slice(20, 32)}`,
  version: 1,
  metadata: {
    timestamp: generatedAt,
    tools: [{ vendor: 'Smart L&F Team', name: 'scripts/generate-sbom.mjs', version: '1.0.0' }],
    component: { type: 'application', name: 'Project-lost-found-system', version: 'release-candidate' },
  },
  components,
};

const licenceInventory = {
  generatedAt,
  source: ['backend/package-lock.json', 'frontend/package-lock.json'],
  uniqueComponents: components.length,
  licenseCounts: Object.fromEntries([...licenseCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  unknownLicenses,
};

fs.mkdirSync(outputs, { recursive: true });
fs.writeFileSync(path.join(outputs, 'SBOM.cdx.json'), `${JSON.stringify(bom, null, 2)}\n`);
fs.writeFileSync(path.join(outputs, 'DEPENDENCY_LICENSES.json'), `${JSON.stringify(licenceInventory, null, 2)}\n`);

const topLicenses = Object.entries(licenceInventory.licenseCounts).sort((a, b) => b[1] - a[1]);
const summary = `# Software Bill of Materials\n\n**Generated:** ${generatedAt}\n\nThis release includes a machine-readable CycloneDX 1.5 inventory generated from the committed npm lockfiles. It is a lockfile inventory, not evidence that a clean target-environment install or live vulnerability scan passed.\n\n- Unique package/version/scope components: **${components.length}**\n- Packages with an unknown lockfile licence field: **${unknownLicenses.length}**\n- Machine-readable SBOM: [SBOM.cdx.json](SBOM.cdx.json)\n- Machine-readable licence inventory: [DEPENDENCY_LICENSES.json](DEPENDENCY_LICENSES.json)\n\n## Licence field summary\n\n| Licence expression | Lockfile entries |\n|---|---:|\n${topLicenses.map(([license, count]) => `| ${license.replaceAll('|', '\\|')} | ${count} |`).join('\n')}\n\n## Release interpretation\n\nFinal approval still requires a clean install, live advisory scan and manual review of packages with missing, ambiguous or policy-sensitive licence metadata.\n`;
fs.writeFileSync(path.join(outputs, 'SBOM.md'), summary);

const licenceReview = `# Dependency Licence Review\n\n**Status:** Release-candidate review evidence; institutional/legal approval pending.\n\nThe committed lockfiles were converted into [DEPENDENCY_LICENSES.json](DEPENDENCY_LICENSES.json) and [SBOM.cdx.json](SBOM.cdx.json). The inventory currently contains **${components.length}** unique package/version/scope components and **${unknownLicenses.length}** entries whose lockfile licence field is unknown.\n\n## Approval rules\n\n1. Re-run this generator after any lockfile change.\n2. Review UNKNOWN, custom, copyleft or dual-licence expressions before release.\n3. Confirm notices/source-offer obligations where applicable.\n4. Run a clean target-environment dependency install and live vulnerability audit.\n5. Record the reviewer, date and exact release checksum in the production approval record.\n\nNo legal conclusion is fabricated by this automated inventory.\n`;
fs.writeFileSync(path.join(outputs, 'DEPENDENCY_LICENCE_REVIEW.md'), licenceReview);
console.log(`Generated CycloneDX SBOM with ${components.length} components; unknown licence fields: ${unknownLicenses.length}.`);
