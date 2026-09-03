import { randomUUID } from 'node:crypto';
import os from 'node:os';
import OutboxEvent from '../models/OutboxEvent.js';
import { processItem } from './itemProcessingService.js';
import { deleteMultipleImages } from './cloudinaryService.js';
import { deliverQueuedMatchNotification } from './smartMatchNotificationService.js';

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

const enqueueMediaDeletion = async (assets, dedupePrefix, session = null) => {
  const candidates = (assets || []).filter((asset) => asset?.publicId);
  const events = [];
  for (let offset = 0; offset < candidates.length; offset += 50) {
    const chunk = candidates.slice(offset, offset + 50);
    const [event] = await OutboxEvent.create([{
      type: 'media.delete',
      payload: { assets: chunk },
      dedupeKey: `media.delete:${dedupePrefix}:${offset / 50}`,
    }], session ? { session } : undefined);
    events.push(event);
  }
  return events;
};

const claimOne = () => {
  const now = new Date();
  const staleMs = Math.max(60_000, Number(process.env.OUTBOX_STALE_MS || 5 * 60 * 1000));
  const stale = new Date(Date.now() - staleMs);
  const leaseId = `${workerId}:${randomUUID()}`;
  return OutboxEvent.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', availableAt: { $lte: now } },
        { status: 'processing', lockedAt: { $lte: stale } },
      ],
    },
    {
      $set: { status: 'processing', lockedAt: now, lockedBy: leaseId },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, new: true },
  );
};

const processOneOutboxEvent = async () => {
  const event = await claimOne();
  if (!event) return false;
  const leaseId = event.lockedBy;
  const heartbeatMs = Math.max(10_000, Math.floor(Math.max(60_000, Number(process.env.OUTBOX_STALE_MS || 5 * 60 * 1000)) / 3));
  const heartbeat = setInterval(() => {
    OutboxEvent.updateOne({ _id: event._id, status: 'processing', lockedBy: leaseId }, { $set: { lockedAt: new Date() } })
      .catch((error) => console.error('[outbox] heartbeat failed', { eventId: String(event._id), error: error.message }));
  }, heartbeatMs);
  heartbeat.unref();
  let update;
  try {
    if (event.type === 'item.process') await processItem(event.payload.itemType, event.payload.itemId);
    else if (event.type === 'media.delete') await deleteMultipleImages(event.payload.assets || [], { strict: true });
    else if (event.type === 'match.notify') await deliverQueuedMatchNotification(event.payload);
    else throw new Error(`Unsupported outbox event type: ${event.type}`);
    update = { status: 'completed', completedAt: new Date(), deadAt: null, lastError: '' };
  } catch (error) {
    const lastError = String(error?.message || error).slice(0, 2000);
    if (event.attempts >= 7) {
      update = { status: 'dead', deadAt: new Date(), lastError };
    } else {
      const delay = Math.min(30 * 60 * 1000, 5_000 * (2 ** Math.max(0, event.attempts - 1)));
      update = { status: 'pending', deadAt: null, lastError, availableAt: new Date(Date.now() + delay) };
    }
  } finally {
    clearInterval(heartbeat);
  }
  const finalized = await OutboxEvent.updateOne(
    { _id: event._id, status: 'processing', lockedBy: leaseId },
    { $set: { ...update, lockedAt: null, lockedBy: '' } },
  );
  if (!finalized.modifiedCount) console.warn('[outbox] lease lost before finalize', { eventId: String(event._id) });
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

export { enqueueItemProcessing, enqueueMediaDeletion, processOneOutboxEvent, processOutboxBatch, startOutboxWorker, stopOutboxWorker };
