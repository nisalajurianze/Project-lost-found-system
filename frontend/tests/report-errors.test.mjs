import assert from 'node:assert/strict';
import test from 'node:test';
import { reportErrorsForForm, reportFieldSteps, reportRejection } from '../src/utils/reportErrors.js';

test('report rejection retains field messages without copying submitted private values', () => {
  const rejected = reportRejection({
    message: 'Validation failed', statusCode: 400,
    errors: [{ field: 'lostDate', message: 'Invalid date', value: 'private input' }, null, { field: 'brand' }],
    request: { body: 'private input' },
  });
  assert.deepEqual(rejected, {
    message: 'Validation failed', statusCode: 400,
    errors: [{ field: 'lostDate', message: 'Invalid date' }],
  });
});

test('lost and found API fields map to the correct editable wizard steps', () => {
  for (const mode of ['lost', 'found']) {
    const fields = reportErrorsForForm({ errors: [
      { field: `${mode}Date`, message: 'Invalid date' },
      { field: `${mode}Location`, message: 'Invalid location' },
      { field: 'brand', message: 'Brand is too long' },
      { field: 'images', message: 'Photo could not be verified' },
    ] }, 'Try again');
    assert.deepEqual(fields, { date: 'Invalid date', location: 'Invalid location', brand: 'Brand is too long', images: 'Photo could not be verified' });
    assert.equal(Math.min(...Object.keys(fields).map((field) => reportFieldSteps[field])), 1);
  }
});

test('unknown and unsafe server field names stay in the review step', () => {
  for (const field of ['unexpected', '__proto__', 'constructor']) {
    assert.deepEqual(reportErrorsForForm({ errors: [{ field, message: 'Please review this report' }] }), {
      submit: 'Please review this report',
    });
  }
  assert.equal(reportFieldSteps.submit, 4);
});

test('report errors keep the first useful field message and handle network failures', () => {
  assert.deepEqual(reportErrorsForForm({ errors: [
    { field: 'category', message: ' ' }, { field: 'category', message: 'Choose a category' },
    { field: 'category', message: 'Invalid category' },
  ] }), { category: 'Choose a category' });
  assert.deepEqual(reportErrorsForForm(reportRejection(new Error('Network unavailable')), 'Try again'), { submit: 'Network unavailable' });
  assert.deepEqual(reportErrorsForForm(null, 'Try again'), { submit: 'Try again' });
  assert.deepEqual(reportErrorsForForm('Session expired', 'Try again'), { submit: 'Session expired' });
});
