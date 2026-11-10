import assert from 'node:assert/strict';
import test from 'node:test';
import { companyResetEmail } from '../lib/password-reset.ts';

test('normalises valid SPSB password-reset addresses', () => {
  assert.equal(companyResetEmail(' Staff.Member@SelangorProperties.com.my '), 'staff.member@selangorproperties.com.my');
});

test('rejects missing, external and malformed addresses', () => {
  for (const value of [undefined, null, '', 'staff@yahoo.com', '@selangorproperties.com.my', 'a@b@selangorproperties.com.my']) {
    assert.equal(companyResetEmail(value), null);
  }
});
