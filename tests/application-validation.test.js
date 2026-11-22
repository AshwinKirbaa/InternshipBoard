import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplication } from '../backend/validation.js';

test('validateApplication accepts valid application data with optional phone', () => {
  const result = validateApplication({
    internshipId: 'INT-101',
    fullName: '  Jane Doe  ',
    email: '  Jane.Doe@Example.COM  ',
    phone: '  +91 98765 43210  ',
    coverNote: '  I am very eager to apply for this role and have 2 years of relevant experience.  ',
  });

  assert.equal(result.errors, undefined);
  assert.deepEqual(result.value, {
    internshipId: 'INT-101',
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+91 98765 43210',
    coverNote: 'I am very eager to apply for this role and have 2 years of relevant experience.',
  });
});

test('validateApplication accepts valid data when phone is omitted or empty', () => {
  for (const phone of [undefined, null, '', '   ']) {
    const input = {
      internshipId: 'INT-101',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      coverNote: 'This is a valid cover note with more than twenty characters.',
    };
    if (phone !== undefined) input.phone = phone;

    const result = validateApplication(input);
    assert.equal(result.errors, undefined);
    assert.equal(result.value.phone, null);
  }
});

test('validateApplication rejects non-object bodies, arrays, and missing required fields', () => {
  assert.ok(validateApplication(null).errors);
  assert.ok(validateApplication([]).errors);
  assert.ok(validateApplication('string').errors);

  const missing = validateApplication({});
  assert.ok(missing.errors.some((e) => e.field === 'internshipId'));
  assert.ok(missing.errors.some((e) => e.field === 'fullName'));
  assert.ok(missing.errors.some((e) => e.field === 'email'));
  assert.ok(missing.errors.some((e) => e.field === 'coverNote'));
});

test('validateApplication rejects unknown fields', () => {
  const result = validateApplication({
    internshipId: 'INT-101',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    coverNote: 'A long enough cover note for the validation check.',
    isAdmin: true,
    salary: 50000,
  });
  assert.ok(result.errors);
  assert.ok(result.errors.some((e) => e.field === 'isAdmin'));
  assert.ok(result.errors.some((e) => e.field === 'salary'));
});

test('validateApplication validates fullName constraints (2-100 characters)', () => {
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: 'A', email: 'a@b.com', coverNote: 'x'.repeat(30) }).errors.some((e) => e.field === 'fullName'));
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: 'A'.repeat(101), email: 'a@b.com', coverNote: 'x'.repeat(30) }).errors.some((e) => e.field === 'fullName'));
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: '   ', email: 'a@b.com', coverNote: 'x'.repeat(30) }).errors.some((e) => e.field === 'fullName'));
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: 12345, email: 'a@b.com', coverNote: 'x'.repeat(30) }).errors.some((e) => e.field === 'fullName'));
});

test('validateApplication validates email constraints (practical email format and max 254 characters)', () => {
  for (const badEmail of ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com', `${'a'.repeat(250)}@example.com`]) {
    const res = validateApplication({
      internshipId: 'INT-101',
      fullName: 'Jane Doe',
      email: badEmail,
      coverNote: 'A long enough cover note for the validation check.',
    });
    assert.ok(res.errors?.some((e) => e.field === 'email'), `Expected bad email rejection for: ${badEmail}`);
  }
});

test('validateApplication validates phone constraints if provided', () => {
  for (const badPhone of ['abc', '123', 'phone#notallowed', '0'.repeat(30)]) {
    const res = validateApplication({
      internshipId: 'INT-101',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: badPhone,
      coverNote: 'A long enough cover note for the validation check.',
    });
    assert.ok(res.errors?.some((e) => e.field === 'phone'), `Expected bad phone rejection for: ${badPhone}`);
  }
});

test('validateApplication validates coverNote constraints (20-2000 characters)', () => {
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: 'Jane', email: 'a@b.com', coverNote: 'Too short' }).errors.some((e) => e.field === 'coverNote'));
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: 'Jane', email: 'a@b.com', coverNote: 'x'.repeat(2001) }).errors.some((e) => e.field === 'coverNote'));
  assert.ok(validateApplication({ internshipId: 'INT-101', fullName: 'Jane', email: 'a@b.com', coverNote: 12345 }).errors.some((e) => e.field === 'coverNote'));
});
