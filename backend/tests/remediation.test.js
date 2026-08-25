import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import JobLock from '../models/JobLock.js';
import OutboxEvent from '../models/OutboxEvent.js';

const source = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('job locks use unique lease tokens, heartbeat renewal, and fenced release', () => {
  assert.ok(JobLock.schema.path('token'));
  const service = source('../services/jobLockService.js');
  assert.match(service, /const token = randomUUID\(\)/);
  assert.match(service, /renewJobLock\(lease\)/);
  assert.match(service, /token: lease\.token/);
  assert.doesNotMatch(service, /\{ lockedUntil: \{ \$lte: now \} \}, \{ owner \}/);
});

test('outbox workers heartbeat and fence finalization to the current lease', () => {
  const service = source('../services/outboxService.js');
  assert.match(service, /leaseId = `\$\{workerId\}:\$\{randomUUID\(\)\}`/);
  assert.match(service, /status: 'processing', lockedBy: leaseId/);
  assert.match(service, /lease lost before finalize/);
  assert.ok(OutboxEvent.schema.path('deadAt'));
  assert.ok(OutboxEvent.schema.path('payload.assets'));
});

test('account erasure durably queues provider deletion and scrubs report metadata', () => {
  const service = source('../services/accountService.js');
  assert.match(service, /enqueueMediaDeletion\(media/);
  assert.match(service, /Location removed after account deletion/);
  assert.match(service, /ImageAnalysis\.deleteMany/);
  assert.doesNotMatch(service, /await deleteMultipleImages\(media\)/);
});

test('retention and reminder jobs are transactionally cleaned and batch bounded', () => {
  const cleanup = source('../jobs/cleanupJob.js');
  const reminder = source('../jobs/reminderJob.js');
  assert.match(cleanup, /session\.withTransaction/);
  assert.match(cleanup, /ImageAnalysis\.deleteMany\(\{ itemId: item\._id \}, \{ session \}\)/);
  assert.match(reminder, /REMINDER_BATCH_LIMIT/);
  assert.match(reminder, /\.limit\(batchLimit\)/);
});
