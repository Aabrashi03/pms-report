import assert from 'node:assert/strict';
import test from 'node:test';
import { restrictPdrChanges } from '../lib/pdr-form-data.ts';

const employeeRows = [
  { employee: '4', manager: '', comments: 'Strong delivery' },
  { employee: '3', manager: '', comments: 'Consistent work' },
];

test('first employee ratings are retained when the stored form has no rating rows', () => {
  const saved = restrictPdrChanges(
    {},
    { sectionA: employeeRows, sectionB: employeeRows, particulars: {}, signatures: {} },
    'employee',
  );

  assert.deepEqual(saved.sectionA, employeeRows);
  assert.deepEqual(saved.sectionB, employeeRows);
});

test('manager ratings preserve the employee self-assessment', () => {
  const current = { sectionA: employeeRows, sectionB: employeeRows, particulars: {}, signatures: {} };
  const incoming = {
    sectionA: employeeRows.map((row, index) => ({ ...row, employee: '0', manager: index === 0 ? '5' : '4' })),
    sectionB: employeeRows.map((row) => ({ ...row, employee: '0', manager: '4' })),
    particulars: {},
    signatures: {},
  };
  const saved = restrictPdrChanges(current, incoming, 'manager') as { sectionA: Array<Record<string,string>>; sectionB: Array<Record<string,string>> };

  assert.deepEqual(saved.sectionA.map((row) => row.employee), ['4', '3']);
  assert.deepEqual(saved.sectionA.map((row) => row.manager), ['5', '4']);
  assert.deepEqual(saved.sectionB.map((row) => row.employee), ['4', '3']);
});
