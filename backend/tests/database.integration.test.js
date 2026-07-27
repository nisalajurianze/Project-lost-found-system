import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.RUN_DB_INTEGRATION === 'true' && Boolean(process.env.MONGO_URI || process.env.MONGODB_URI);

test('concurrent refresh reuse revokes the complete session family', { skip: !enabled }, async () => {
  process.env.JWT_ACCESS_SECRET ||= 'integration-test-secret-that-is-longer-than-32-characters';
  process.env.NODE_ENV = 'test';
  const mongoose = (await import('mongoose')).default;
  const User = (await import('../models/User.js')).default;
  const RefreshSession = (await import('../models/RefreshSession.js')).default;
  const { createSession, rotateSession } = await import('../services/sessionService.js');

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri, { dbName: `smart_lf_integration_${Date.now()}` });
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    assert.ok(hello.setName, 'A replica set is required for transaction tests');
    const user = await User.create({
      fullName: 'Integration User',
      email: `integration-${Date.now()}@example.com`,
      studentId: `INT-${Date.now()}`,
      password: 'StrongPassword!123',
      isVerified: true,
    });
    const req = { get: () => 'node-test', ip: '127.0.0.1', socket: {} };
    const cookies = new Map();
    const res = { cookie: (name, value) => cookies.set(name, value) };
    await createSession(user, req, res);
    const raw = cookies.get('refreshToken');
    assert.ok(raw);

    const firstCookies = new Map();
    const secondCookies = new Map();
    const results = await Promise.allSettled([
      rotateSession(raw, req, { cookie: (name, value) => firstCookies.set(name, value) }),
      rotateSession(raw, req, { cookie: (name, value) => secondCookies.set(name, value) }),
    ]);
    assert.equal(results.filter((entry) => entry.status === 'fulfilled').length, 1);
    assert.equal(results.filter((entry) => entry.status === 'rejected').length, 1);
    const active = await RefreshSession.countDocuments({ userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
    assert.equal(active, 0, 'Reuse detection must revoke the replacement token too');
  } finally {
    await mongoose.connection.dropDatabase().catch(() => undefined);
    await mongoose.disconnect();
  }
});
