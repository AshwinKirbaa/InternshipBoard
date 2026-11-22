import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapServerErrors,
  normalizeApplicationPayload,
  validateClientApplication,
} from '../js/details.js';

test('normalizeApplicationPayload trims strings, lowercases email, and normalizes phone', () => {
  const normalized = normalizeApplicationPayload({
    internshipId: '  INT-101  ',
    fullName: '  Jane Doe  ',
    email: '  Jane.Doe@EXAMPLE.COM  ',
    phone: '  +1 (555) 019-2834  ',
    coverNote: '  A very passionate cover note explaining why I want this role.  ',
  });

  assert.deepEqual(normalized, {
    internshipId: 'INT-101',
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 019-2834',
    coverNote: 'A very passionate cover note explaining why I want this role.',
  });

  const emptyPhone = normalizeApplicationPayload({
    internshipId: 'INT-101',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '   ',
    coverNote: 'A very passionate cover note explaining why I want this role.',
  });
  assert.equal(emptyPhone.phone, null);
});

test('validateClientApplication passes for valid inputs', () => {
  const result = validateClientApplication({
    internshipId: 'INT-101',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-0123',
    coverNote: 'This is a valid cover note with more than twenty characters.',
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateClientApplication returns field-specific errors for invalid inputs', () => {
  const result = validateClientApplication({
    internshipId: 'INT-101',
    fullName: 'J',
    email: 'invalid-email',
    phone: '123',
    coverNote: 'Too short',
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.fullName);
  assert.ok(result.errors.email);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.coverNote);
});

test('mapServerErrors maps array of server field errors into an error dictionary', () => {
  const details = [
    { field: 'email', message: 'must be a valid email address' },
    { field: 'coverNote', message: 'must be between 20 and 2000 characters' },
  ];

  const mapped = mapServerErrors(details);
  assert.deepEqual(mapped, {
    email: 'must be a valid email address',
    coverNote: 'must be between 20 and 2000 characters',
  });

  assert.deepEqual(mapServerErrors(null), {});
  assert.deepEqual(mapServerErrors([]), {});
});
