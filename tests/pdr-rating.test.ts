import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRating, combineRatings, displayRating } from '../lib/pdr-rating.ts';

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
