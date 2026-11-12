import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateKpiRating, calculateRating, combineRatings, displayRating } from '../lib/pdr-rating.ts';

test('calculates the expected Section A and Section B ratings',()=>{
  const validSectionA=[...Array(9).fill(0).map(()=>({manager:'4'})),...Array(6).fill(0).map(()=>({manager:'3'}))];
  const sectionB=[{manager:'4'},{manager:'4'},{manager:'4'},{manager:'3'}];
  const a=calculateRating(validSectionA,'manager',15);
  const b=calculateRating(sectionB,'manager',4);
  assert.deepEqual({points:a.points,maximum:a.maximum,average:a.average},{points:54,maximum:75,average:3.6});
  assert.deepEqual({points:b.points,maximum:b.maximum,average:b.average},{points:15,maximum:20,average:3.75});
  const overall=combineRatings(a,b);
  assert.equal(overall.points,69);
  assert.equal(overall.maximum,95);
  assert.equal(displayRating(overall.average),'3.63');
});

test('excludes missing and invalid values without treating them as zero',()=>{
  const result=calculateRating([{employee:'5'},{employee:''},{employee:'6'},{employee:'x'}],'employee',4);
  assert.equal(result.points,5);
  assert.equal(result.completed,1);
  assert.equal(result.average,5);
  assert.equal(result.complete,false);
});

test('calculates Section C using completed KPI rows only',()=>{
  const threeRows=calculateKpiRating([
    {kra:'KRA 1',kpi:'KPI 1',action:'Action 1',rating:'4'},
    {kra:'KRA 2',kpi:'KPI 2',action:'Action 2',rating:'3'},
    {kra:'KRA 3',kpi:'KPI 3',action:'Action 3',rating:'5'},
    {kra:'',kpi:'',action:'',rating:''},
  ]);
  assert.deepEqual({points:threeRows.points,applicable:threeRows.applicable,maximum:threeRows.maximum,average:threeRows.average},{points:12,applicable:3,maximum:15,average:4});

  const fourRows=calculateKpiRating([
    {kra:'KRA 1',kpi:'KPI 1',action:'Action 1',rating:'4'},
    {kra:'KRA 2',kpi:'KPI 2',action:'Action 2',rating:'3'},
    {kra:'KRA 3',kpi:'KPI 3',action:'Action 3',rating:'5'},
    {kra:'KRA 4',kpi:'KPI 4',action:'Action 4',rating:'2'},
  ]);
  assert.equal(fourRows.average,3.5);
  assert.equal(fourRows.maximum,20);
});

test('does not publish a Section C average until every completed KPI row is rated',()=>{
  const result=calculateKpiRating([
    {kra:'KRA 1',kpi:'KPI 1',action:'Action 1',rating:'4'},
    {kra:'KRA 2',kpi:'KPI 2',action:'Action 2',rating:''},
  ]);
  assert.equal(result.average,null);
  assert.equal(result.complete,false);
  assert.equal(result.completed,1);
  assert.equal(result.applicable,2);
});
