import test from "node:test";
import assert from "node:assert/strict";
import { hasSeparateHod, secondApproverEmail, stageAfterSuperior, workflowSteps } from "../lib/workflow-route.ts";

test("one assigned superior skips the duplicate HOD stage",()=>{
  const staff={manager_email:"pung@selangorproperties.com.my",hod_email:null,head_of_division_email:null};
  assert.equal(hasSeparateHod(staff),false);
  assert.equal(stageAfterSuperior(staff),"hr_review");
  assert.deepEqual(workflowSteps(staff).map(step=>step.label),["Employee","Assigned superior (N+1)","HR","Completed"]);
});

test("a different HOD keeps both review stages",()=>{
  const staff={manager_email:"manager@selangorproperties.com.my",hod_email:"hod@selangorproperties.com.my",head_of_division_email:null};
  assert.equal(hasSeparateHod(staff),true);
  assert.equal(stageAfterSuperior(staff),"hod_endorsement");
  assert.deepEqual(workflowSteps(staff).map(step=>step.label),["Employee","Manager (N+1)","HOD (N+2)","HR","Completed"]);
});

test("the same person in both fields is shown only once",()=>{
  const staff={manager_email:"PUNG@selangorproperties.com.my",hod_email:" pung@selangorproperties.com.my ",head_of_division_email:null};
  assert.equal(hasSeparateHod(staff),false);
});

test("head of division is the N+2 approver after a Manager or HOD",()=>{
  const staff={manager_email:"yap@selangorproperties.com.my",hod_email:"yap@selangorproperties.com.my",head_of_division_email:"pung@selangorproperties.com.my"};
  assert.equal(secondApproverEmail(staff),"pung@selangorproperties.com.my");
  assert.deepEqual(workflowSteps(staff).map(step=>step.label),["Employee","Manager / HOD (N+1)","Head of Division (N+2)","HR","Completed"]);
});
