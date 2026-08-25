import os from 'node:os';
import { randomUUID } from 'node:crypto';
import JobLock from '../models/JobLock.js';

const owner = `${os.hostname()}:${process.pid}`;

const acquireJobLock = async (name, ttlMs) => {
  const now = new Date();
  const lockedUntil = new Date(Date.now() + ttlMs);
  const token = randomUUID();
  try {
    const lock = await JobLock.findOneAndUpdate(
      { name, lockedUntil: { $lte: now } },
      { $set: { owner, token, lockedUntil } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return lock?.owner === owner && lock?.token === token ? { name, owner, token, ttlMs } : null;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
};

const renewJobLock = (lease) => JobLock.updateOne(
  { name: lease.name, owner: lease.owner, token: lease.token },
  { $set: { lockedUntil: new Date(Date.now() + lease.ttlMs) } },
);

const releaseJobLock = (lease) => JobLock.deleteOne({ name: lease.name, owner: lease.owner, token: lease.token });

const withJobLock = async (name, ttlMs, task) => {
  const lease = await acquireJobLock(name, ttlMs);
  if (!lease) return { skipped: true };
  const heartbeat = setInterval(() => {
    renewJobLock(lease).catch((error) => console.error('[job-lock] heartbeat failed', { name, error: error.message }));
  }, Math.max(1000, Math.floor(ttlMs / 3)));
  heartbeat.unref();
  try { return await task(lease); }
  finally {
    clearInterval(heartbeat);
    await releaseJobLock(lease).catch(() => undefined);
  }
};

export { acquireJobLock, renewJobLock, releaseJobLock, withJobLock };
