import assert from 'node:assert/strict';
import test from 'node:test';
import { safeAuthDestination } from '../lib/auth-redirect.ts';
test('authentication redirects accept only known local routes',()=>{
  for(const path of ['/','/staff','/cycles','/reports','/team','/reset-password'])assert.equal(safeAuthDestination(path),path);
});
test('external, encoded and unknown destinations cannot redirect away',()=>{
  for(const path of [undefined,null,'','https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/unknown','/reports?next=https://evil.example'])assert.equal(safeAuthDestination(path),'/');
});
