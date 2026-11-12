import assert from 'node:assert/strict';
import test from 'node:test';
import { canOpenWorkspacePath, effectivePdrRole, visibleWorkspacePaths } from '../lib/role-navigation.ts';

test('employees see only their overview and PDR', () => {
  assert.deepEqual(visibleWorkspacePaths('employee'), ['/', '/pdr']);
  for (const path of ['/staff', '/cycles', '/reports', '/team']) {
    assert.equal(canOpenWorkspacePath('employee', path), false);
  }
});

test('reviewers see assigned people without HR administration', () => {
  for (const role of ['manager', 'hod'] as const) {
    assert.equal(canOpenWorkspacePath(role, '/staff'), true);
    assert.equal(canOpenWorkspacePath(role, '/cycles'), false);
    assert.equal(canOpenWorkspacePath(role, '/reports'), false);
    assert.equal(canOpenWorkspacePath(role, '/team'), false);
  }
});

test('only the owner receives every workspace page', () => {
  assert.deepEqual(visibleWorkspacePaths('owner'), ['/', '/pdr', '/staff', '/cycles', '/reports', '/team']);
  assert.equal(canOpenWorkspacePath('editor', '/team'), false);
  assert.equal(canOpenWorkspacePath('viewer', '/reports'), true);
});

test('reviewers opening their own PDR act as the employee', () => {
  assert.equal(effectivePdrRole('manager', 'norsaifulnizam@selangorproperties.com.my', 'NORSAIFULNIZAM@selangorproperties.com.my'), 'employee');
  assert.equal(effectivePdrRole('hod', 'hod@selangorproperties.com.my', 'hod@selangorproperties.com.my'), 'employee');
  assert.equal(effectivePdrRole('manager', 'manager@selangorproperties.com.my', 'employee@selangorproperties.com.my'), 'manager');
});

test('HR administrators keep administrative access to their own PDR', () => {
  assert.equal(effectivePdrRole('owner', 'maznah.bahudin@selangorproperties.com.my', 'maznah.bahudin@selangorproperties.com.my'), 'owner');
  assert.equal(effectivePdrRole('editor', 'hr@selangorproperties.com.my', 'hr@selangorproperties.com.my'), 'editor');
});
