import os from 'node:os';
import JobLock from '../models/JobLock.js';

const owner = `${os.hostname()}:${process.pid}`;

const acquireJobLock = async (name, ttlMs) => {
  const now = new Date();
  const lockedUntil = new Date(Date.now() + ttlMs);
  try {
    const lock = await JobLock.findOneAndUpdate(
      { name, $or: [{ lockedUntil: { $lte: now } }, { owner }] },
      { $set: { owner, lockedUntil } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return lock?.owner === owner;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
};

const releaseJobLock = (name) => JobLock.deleteOne({ name, owner });

const withJobLock = async (name, ttlMs, task) => {
  if (!await acquireJobLock(name, ttlMs)) return { skipped: true };
  try { return await task(); }
  finally { await releaseJobLock(name).catch(() => undefined); }
};

export { acquireJobLock, releaseJobLock, withJobLock };
