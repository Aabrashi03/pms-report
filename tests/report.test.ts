import assert from 'node:assert/strict';
import test from 'node:test';
import { summarise, executiveSummary } from '../lib/report.ts';
const row = (status: string, rating: string | null = null, reviewer: string | null = null, department = 'HR') => ({ derived_status: status, rating, reviewer_name: reviewer, staff: { department } });
test('pending appraisals are outstanding even when none are overdue', () => {
  const s = summarise([row('not_submitted')]);
  assert.equal(s.outstanding, 1); assert.equal(s.overdue, 0); assert.equal(s.pending, 1);
  assert.equal(s.onTimeRate, null); assert.ok(!executiveSummary('Cycle', s).includes('All recorded'));
});
test('submission, rating and quality denominators remain distinct', () => {
  const s = summarise([row('submitted','Outstanding','Jane'),row('late',null,null),row('overdue','Outstanding','Jane'),row('not_submitted'),row('submitted','Unknown','Jane')]);
  assert.equal(s.completed,3); assert.equal(s.completionRate,60); assert.equal(s.onTimeRate,67);
  assert.equal(s.rated,1); assert.equal(s.ratings[0].share,100); assert.equal(s.missingRating,1); assert.equal(s.unrecognisedRating,1); assert.equal(s.incomplete,2);
  assert.equal(s.departments[0].outstanding,2);
});
test('empty cycles produce no artificial percentages or completion claims', () => {
  const s = summarise([]); assert.equal(s.completionRate,null); assert.equal(s.ratings[0].share,null);
  assert.match(executiveSummary('Cycle',s),/no appraisal records/);
});
test('department priorities follow overdue workload and normalise blank names', () => {
  const s = summarise([row('submitted','Meets Expectations','Jane','HR'),row('overdue',null,null,' '),row('not_submitted',null,null,'Sales')]);
  assert.equal(s.departments[0].name,'Unassigned'); assert.equal(s.departments[0].overdue,1);
});
