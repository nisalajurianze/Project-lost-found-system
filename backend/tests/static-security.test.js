import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(backend, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('browser authentication uses cookies, not persistent token storage', () => {
  const api = read('frontend/src/services/api.js');
  const auth = read('frontend/src/services/authService.js');
  const slice = read('frontend/src/redux/slices/authSlice.js');
  const combined = `${api}\n${auth}\n${slice}`;
  assert.doesNotMatch(combined, /localStorage\.(?:setItem|getItem)\([^\n]*(?:accessToken|refreshToken|token|user)/i);
  assert.match(api, /withCredentials:\s*true/);
  assert.match(api, /X-CSRF-Token/);
});

test('refresh and reset secrets are accepted only in request bodies', () => {
  const routes = read('backend/routes/authRoutes.js');
  const controller = read('backend/controllers/authController.js');
  assert.doesNotMatch(routes, /router\.get\(['"]\/refresh-token/);
  assert.doesNotMatch(controller, /req\.query\.(?:refreshToken|token)/);
  assert.doesNotMatch(controller, /req\.body\.refreshToken/);
  assert.match(controller, /resetPasswordTokenHash/);
  assert.match(controller, /verificationTokenHash/);
});

test('startup contains no hardcoded administrator promotion', () => {
  const server = read('backend/server.js');
  assert.doesNotMatch(server, /findOneAndUpdate[\s\S]{0,300}role:\s*['"]admin/);
  assert.doesNotMatch(server, /smartlostandfound\.seusl@gmail\.com/i);
});

test('container definitions use Node 22 and no default production secrets', () => {
  assert.match(read('backend/Dockerfile'), /FROM node:22/);
  assert.match(read('frontend/Dockerfile'), /FROM node:22/);
  const compose = read('docker-compose.yml');
  assert.match(compose, /JWT_ACCESS_SECRET:\s*\$\{JWT_ACCESS_SECRET:\?/);
  assert.doesNotMatch(compose, /admin123|your-jwt-access-secret/i);
  assert.match(compose, /replicaSet=rs0/);
});

test('unsafe CSP eval and wildcard Vercel origin exceptions are absent', () => {
  const server = read('backend/server.js');
  const nginx = read('frontend/nginx.conf');
  assert.doesNotMatch(`${server}\n${nginx}`, /unsafe-eval/);
  assert.doesNotMatch(server, /\.vercel\.app/);
  assert.match(server, /clientOrigins\.includes/);
});


test('frontend reset and verification tokens are fragment-only', () => {
  const reset = read('frontend/src/pages/public/ResetPassword.jsx');
  const verify = read('frontend/src/pages/public/VerifyEmail.jsx');
  assert.match(reset, /window\.location\.hash/);
  assert.match(verify, /window\.location\.hash/);
  assert.doesNotMatch(`${reset}\n${verify}`, /window\.location\.search|useSearchParams/);
});

test('public metrics contain no invented AI accuracy or daily-user claims', () => {
  const stats = read('backend/controllers/statsController.js');
  const home = read('frontend/src/pages/public/Home.jsx');
  assert.doesNotMatch(`${stats}\n${home}`, /96%|daily active|active daily|millisecond/i);
  assert.match(stats, /completedRecoveries/);
});

test('settings are typed and private anti-spam controls cannot be public', () => {
  const controller = read('backend/controllers/systemSettingController.js');
  assert.match(controller, /SETTING_DEFINITIONS/);
  assert.match(controller, /spam_max_pending_claims:\s*\{\s*public:\s*false/);
  assert.match(controller, /contact_details:\s*\{\s*public:\s*true/);
});

test('production startup verifies transaction support', () => {
  const server = read('backend/server.js');
  const db = read('backend/config/db.js');
  assert.match(server, /assertTransactionSupport/);
  assert.match(db, /hello\.setName|hello\?\.setName/);
});

test('claim and location query surfaces have explicit validation', () => {
  const validators = read('backend/utils/validators.js');
  const routes = read('backend/routes/locationKnowledgeRoutes.js');
  assert.match(validators, /query\('claimantId'\)\.optional\([^)]*\)\.isMongoId\(\)/);
  assert.match(validators, /locationResolveQueryValidator/);
  assert.match(validators, /locationReviewValidator/);
  assert.match(routes, /locationSuggestionValidator, validate, submitLocationSuggestion/);
  assert.match(routes, /locationReviewValidator, validate, reviewLocationKnowledge/);
});

test('item listing and administrator log filters reject malformed identifiers and dates', () => {
  const validators = read('backend/utils/validators.js');
  const lostRoutes = read('backend/routes/lostItemRoutes.js');
  const foundRoutes = read('backend/routes/foundItemRoutes.js');
  const adminRoutes = read('backend/routes/adminRoutes.js');
  assert.match(validators, /query\('userId'\)\.optional\([^)]*\)\.isMongoId\(\)/);
  assert.match(validators, /query\('startDate'\)\.optional\([^)]*\)\.isISO8601\(\)/);
  assert.match(validators, /query\('adminId'\)\.optional\([^)]*\)\.isMongoId\(\)/);
  assert.match(lostRoutes, /lostItemQueryValidator, validate, getLostItems/);
  assert.match(foundRoutes, /foundItemQueryValidator, validate, getFoundItems/);
  assert.match(adminRoutes, /adminLogQueryValidator, validate, getAdminLogs/);
});

test('resolution reminders are marked sent only after every participant succeeds', () => {
  const reminder = read('backend/jobs/reminderJob.js');
  assert.match(reminder, /results\.every\(\(result\) => result\.status === 'fulfilled'\)/);
  assert.doesNotMatch(reminder, /results\.some\(\(result\) => result\.status === 'fulfilled'\)/);
});
