import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordPolicyError, passwordRequirementResults } from '../lib/password-policy.ts';

test('accepts a password that meets every SPSB requirement',()=>{
  assert.equal(passwordPolicyError('Spsb@2026'),'');
  assert.equal(passwordRequirementResults('Spsb@2026').every(rule=>rule.met),true);
});

test('rejects passwords missing any required character class',()=>{
  for(const password of ['Ab1@xyz','lowercase1@','UPPERCASE1@','NoNumber@','NoSpecial1']){
    assert.notEqual(passwordPolicyError(password),'');
  }
});

test('spaces do not count as special characters',()=>{
  assert.match(passwordPolicyError('Password 1'),/special character/);
});
