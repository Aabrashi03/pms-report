import assert from 'node:assert/strict';
import test from 'node:test';
import { canOpenWorkspacePath, visibleWorkspacePaths } from '../lib/role-navigation.ts';

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
