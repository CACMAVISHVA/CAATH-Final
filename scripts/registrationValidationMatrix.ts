import assert from 'node:assert/strict';
import { normalizeAuthError } from '../src/lib/authErrorNormalizer';
import {
  normalizeIndianPhone,
  validateEmail,
  validateGSTIN,
  validateIndianMobile,
  validatePassword,
  validateRequiredName,
} from '../src/lib/fieldValidation';

const matrix: Array<{ name: string; actual: boolean; expected: boolean }> = [
  { name: 'firm name accepts professional punctuation', actual: validateRequiredName('Vishva R. S. & Associates', 'Firm name').valid, expected: true },
  { name: 'firm name rejects symbols-only input', actual: validateRequiredName('@@@', 'Firm name').valid, expected: false },
  { name: 'email accepts uppercase and is normalized later', actual: validateEmail('OWNER@EXAMPLE.COM').valid, expected: true },
  { name: 'email rejects missing domain', actual: validateEmail('owner@').valid, expected: false },
  { name: 'mobile accepts +91 formatting', actual: validateIndianMobile('+91 98765 43210').valid, expected: true },
  { name: 'mobile rejects an invalid starting digit', actual: validateIndianMobile('5876543210').valid, expected: false },
  { name: 'optional GSTIN accepts blank', actual: validateGSTIN('').valid, expected: true },
  { name: 'GSTIN accepts a structurally valid value', actual: validateGSTIN('27ABCDE1234F1Z5').valid, expected: true },
  { name: 'GSTIN rejects arbitrary text', actual: validateGSTIN('RANDOM NAME').valid, expected: false },
  { name: 'password accepts all required character groups', actual: validatePassword('Qa!Practice2026').valid, expected: true },
  { name: 'password rejects short values', actual: validatePassword('Ab1!xyz').valid, expected: false },
  { name: 'password rejects missing uppercase', actual: validatePassword('practice!2026').valid, expected: false },
  { name: 'password rejects missing lowercase', actual: validatePassword('PRACTICE!2026').valid, expected: false },
  { name: 'password rejects missing number', actual: validatePassword('Practice!Secure').valid, expected: false },
  { name: 'password rejects missing special character', actual: validatePassword('Practice2026').valid, expected: false },
];

for (const test of matrix) {
  assert.equal(test.actual, test.expected, test.name);
  console.log(`PASS ${test.name}`);
}

assert.equal(normalizeIndianPhone('+91 98765 43210'), '9876543210');
assert.equal(normalizeAuthError({ code: 'weak_password', message: 'Password is known to be weak and easy to guess.' }).code, 'WEAK_PASSWORD');
assert.equal(normalizeAuthError({ code: 'user_already_exists', message: 'User already registered' }).code, 'USER_ALREADY_EXISTS');
assert.match(normalizeAuthError({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }).userMessage, /wait a few minutes/i);

console.log(`Registration validation matrix passed: ${matrix.length + 4} checks.`);
