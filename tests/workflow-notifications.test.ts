import test from "node:test";
import assert from "node:assert/strict";
import { notificationRecipients, stageAction } from "../lib/workflow-notifications.ts";

const staff={email:"saiful@selangorproperties.com.my",manager_email:"chyap@selangorproperties.com.my",hod_email:"hod@selangorproperties.com.my",head_of_division_email:"division@selangorproperties.com.my"};

test("employee submission notifies the assigned N+1 manager",()=>{
  assert.deepEqual(notificationRecipients("manager_review",staff,"maznah.bahudin@selangorproperties.com.my"),["chyap@selangorproperties.com.my"]);
});

test("N+1 submission notifies the assigned N+2 approver",()=>{
  assert.deepEqual(notificationRecipients("hod_endorsement",staff,"maznah.bahudin@selangorproperties.com.my"),["division@selangorproperties.com.my"]);
});

test("completion notifies HR, employee and N+1 without duplicate or external addresses",()=>{
  const recipients=notificationRecipients("completed",staff,"maznah.bahudin@selangorproperties.com.my,external@example.com");
  assert.deepEqual(recipients,["maznah.bahudin@selangorproperties.com.my","saiful@selangorproperties.com.my","chyap@selangorproperties.com.my"]);
});

test("returned PDR notifies the employee without exposing the correction reason",()=>{
  assert.deepEqual(notificationRecipients("returned",staff,"maznah.bahudin@selangorproperties.com.my"),["saiful@selangorproperties.com.my"]);
  assert.equal(stageAction("returned"),"Employee correction required");
});
