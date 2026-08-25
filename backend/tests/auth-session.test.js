import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'auth-session-test-secret-that-is-longer-than-32-characters';
process.env.CLIENT_URLS = 'https://lost.example.edu,https://admin.example.edu';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(backend, relative), 'utf8');

test('access JWT is bound to one server-side refresh family', async () => {
  const { issueAccessToken } = await import('../services/sessionService.js');
  const token = issueAccessToken(
    { _id: { toString: () => '507f1f77bcf86cd799439011' }, role: 'user', email: 'user@example.edu' },
    'family-123',
  );
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'smart-lf',
  });
  assert.equal(payload.sub, '507f1f77bcf86cd799439011');
  assert.equal(payload.sid, 'family-123');
  assert.equal(typeof payload.jti, 'string');
  assert.ok(payload.jti.length >= 16);
  assert.throws(
    () => issueAccessToken({ _id: { toString: () => payload.sub }, role: 'user', email: 'user@example.edu' }),
    /valid session family/,
  );
});

test('legacy access JWT without a session family fails before database access', async () => {
  const { verifyAccessSession } = await import('../middlewares/authMiddleware.js');
  const legacy = jwt.sign({}, process.env.JWT_ACCESS_SECRET, {
    subject: '507f1f77bcf86cd799439011',
    issuer: 'smart-lf',
    algorithm: 'HS256',
    expiresIn: '5m',
  });
  await assert.rejects(() => verifyAccessSession(legacy), /Access session is invalid/);
});

test('HTTP access verification requires an active, uncompromised refresh family', () => {
  const middleware = read('middlewares/authMiddleware.js');
  assert.match(middleware, /typeof familyId !== 'string'/);
  assert.match(middleware, /RefreshSession\.exists/);
  assert.match(middleware, /return verifySessionFamily\(decoded\.sub, decoded\.sid\)/);
  assert.match(middleware, /familyId,/);
  assert.match(middleware, /revokedAt: null/);
  assert.match(middleware, /compromisedAt: null/);
  assert.match(middleware, /familyExpiresAt: \{ \$gt: now \}/);
});

test('refresh rotation is transaction-only and preserves absolute family expiry', () => {
  const service = read('services/sessionService.js');
  const model = read('models/RefreshSession.js');
  assert.match(service, /withTransaction\(\(\) => performRotation\(dbSession\)\)/);
  assert.doesNotMatch(service, /performRotation\(null\)/);
  assert.match(service, /expiresAt: familyExpiresAt/);
  assert.match(service, /familyExpiresAt,/);
  assert.match(service, /compromisedAt: now/);
  assert.match(model, /familyExpiresAt: \{ type: Date, required: true \}/);
  assert.match(model, /compromisedAt: \{ type: Date, default: null \}/);
});

test('password changes and resets commit credential mutation with session revocation', () => {
  for (const relative of ['controllers/userController.js', 'controllers/authController.js']) {
    const controller = read(relative);
    assert.match(controller, /session\.withTransaction/);
    assert.match(controller, /user\.save\(\{ session \}\)/);
    assert.match(controller, /revokeAllUserSessions\(user\._id, \{ session, disconnect: false \}\)/);
    assert.match(controller, /disconnectRevokedUserSessions/);
  }
});

test('Socket.IO accepts only exact configured origins and revalidates sessions', async () => {
  const { isAllowedSocketOrigin } = await import('../config/socket.js');
  assert.equal(isAllowedSocketOrigin('https://lost.example.edu'), true);
  assert.equal(isAllowedSocketOrigin('https://admin.example.edu/'), true);
  assert.equal(isAllowedSocketOrigin('https://lost.example.edu.attacker.invalid'), false);
  assert.equal(isAllowedSocketOrigin('https://attacker.invalid'), false);
  assert.equal(isAllowedSocketOrigin(undefined), false);

  const socket = read('config/socket.js');
  assert.match(socket, /allowRequest\(req, callback\)/);
  assert.match(socket, /verifyAccessSession/);
  assert.match(socket, /setInterval\(\(\) => \{ void revalidate\(\); \}, SOCKET_REVALIDATE_MS\)/);
  assert.match(socket, /disconnectSessionSockets/);
  assert.match(socket, /disconnectUserSockets/);
});
