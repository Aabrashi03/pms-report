import assert from "node:assert/strict";
import test from "node:test";
import { deriveStatus } from "../lib/data/types.ts";

const afterDueDate = new Date("2024-12-30T12:00:00Z");

test("unsubmitted appraisals become overdue after the cycle deadline", () => {
  assert.equal(deriveStatus(null, "2024-12-20", afterDueDate), "overdue");
});

test("a date on or before the deadline is submitted", () => {
  assert.equal(deriveStatus("2024-12-18", "2024-12-20", afterDueDate), "submitted");
  assert.equal(deriveStatus("2024-12-20", "2024-12-20", afterDueDate), "submitted");
});

test("a date after the deadline is late", () => {
  assert.equal(deriveStatus("2024-12-21", "2024-12-20", afterDueDate), "late");
});

test("the PRD success scenario increments completion from three to four", () => {
  const statuses = ["submitted", "submitted", "overdue", "overdue", "submitted", "overdue"];
  const before = statuses.filter((status) => ["submitted", "late"].includes(status)).length;
  statuses[5] = deriveStatus("2024-12-18", "2024-12-20", afterDueDate);
  const after = statuses.filter((status) => ["submitted", "late"].includes(status)).length;
  assert.deepEqual({ before, after, tom: statuses[5] }, { before: 3, after: 4, tom: "submitted" });
});
