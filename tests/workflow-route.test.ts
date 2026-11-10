import test from "node:test";
import assert from "node:assert/strict";
import { hasSeparateHod, stageAfterSuperior, workflowSteps } from "../lib/workflow-route.ts";

test("one assigned superior skips the duplicate HOD stage",()=>{
  const staff={manager_email:"pung@selangorproperties.com.my",hod_email:null,head_of_division_email:null};
  assert.equal(hasSeparateHod(staff),false);
  assert.equal(stageAfterSuperior(staff),"hr_review");
  assert.deepEqual(workflowSteps(staff).map(step=>step.label),["Employee","Assigned superior","HR","Completed"]);
});

test("a different HOD keeps both review stages",()=>{
  const staff={manager_email:"manager@selangorproperties.com.my",hod_email:"hod@selangorproperties.com.my",head_of_division_email:null};
  assert.equal(hasSeparateHod(staff),true);
  assert.equal(stageAfterSuperior(staff),"hod_endorsement");
  assert.deepEqual(workflowSteps(staff).map(step=>step.label),["Employee","Manager","HOD","HR","Completed"]);
});

test("the same person in both fields is shown only once",()=>{
  const staff={manager_email:"PUNG@selangorproperties.com.my",hod_email:" pung@selangorproperties.com.my ",head_of_division_email:null};
  assert.equal(hasSeparateHod(staff),false);
});
