import { randomUUID } from 'node:crypto';
import os from 'node:os';
import OutboxEvent from '../models/OutboxEvent.js';
import { processItem } from './itemProcessingService.js';

const workerId = `${os.hostname()}:${process.pid}`;
let timer = null;
let running = false;

const enqueueItemProcessing = async (itemType, itemId, version = randomUUID(), session = null) => {
  const dedupeKey = `item.process:${itemType}:${itemId}:${version}`;
  const [event] = await OutboxEvent.create([{
    type: 'item.process',
    payload: { itemType, itemId },
    dedupeKey,
  }], session ? { session } : undefined);
  return event;
};

const claimOne = () => {
  const now = new Date();
  const stale = new Date(Date.now() - 5 * 60 * 1000);
  return OutboxEvent.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', availableAt: { $lte: now } },
        { status: 'processing', lockedAt: { $lte: stale } },
      ],
    },
    {
      $set: { status: 'processing', lockedAt: now, lockedBy: workerId },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, new: true },
  );
};

const processOneOutboxEvent = async () => {
  const event = await claimOne();
  if (!event) return false;
  try {
    if (event.type === 'item.process') await processItem(event.payload.itemType, event.payload.itemId);
    else throw new Error(`Unsupported outbox event type: ${event.type}`);
    event.status = 'completed';
    event.completedAt = new Date();
    event.lastError = '';
  } catch (error) {
    event.lastError = String(error?.message || error).slice(0, 2000);
    if (event.attempts >= 7) {
      event.status = 'dead';
    } else {
      event.status = 'pending';
      const delay = Math.min(30 * 60 * 1000, 5_000 * (2 ** Math.max(0, event.attempts - 1)));
      event.availableAt = new Date(Date.now() + delay);
    }
  }
  event.lockedAt = null;
  event.lockedBy = '';
  await event.save();
  return true;
};

const processOutboxBatch = async (limit = 10) => {
  if (running) return 0;
  running = true;
  let processed = 0;
  try {
    while (processed < limit && await processOneOutboxEvent()) processed += 1;
    return processed;
  } finally {
    running = false;
  }
};

const startOutboxWorker = () => {
  if (timer) return;
  processOutboxBatch().catch((error) => console.error('[outbox] initial batch failed', error.message));
  timer = setInterval(() => {
    processOutboxBatch().catch((error) => console.error('[outbox] batch failed', error.message));
  }, 5_000);
  timer.unref();
  console.log('[outbox] durable worker started.');
};

const stopOutboxWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

export { enqueueItemProcessing, processOneOutboxEvent, processOutboxBatch, startOutboxWorker, stopOutboxWorker };
