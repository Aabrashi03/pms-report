import { createClient } from "@/lib/supabase/client";
import { deriveStatus, type SubmissionStatus } from "./types";

export type StaffRecord = { id: string; employee_id: string; full_name: string; department: string | null; position: string | null };
export type SubmissionRecord = { id: string; cycle_id: string; staff_id: string; status: SubmissionStatus; submission_date: string | null; rating: string | null; reviewer_name: string | null; comments: string | null };
export type DashboardRow = SubmissionRecord & { staff: StaffRecord; derived_status: SubmissionStatus };

export async function getActiveCycleDashboard() {
  const supabase = createClient();
  const { data: cycle, error: cycleError } = await supabase.from("appraisal_cycles").select("id,name,due_date").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cycleError) throw new Error(cycleError.message);
  if (!cycle) return { cycle: null, rows: [] as DashboardRow[] };
  const { data, error } = await supabase.from("appraisal_submissions").select("id,cycle_id,staff_id,status,submission_date,rating,reviewer_name,comments,staff!inner(id,employee_id,full_name,department,position)").eq("cycle_id", cycle.id);
  if (error) throw new Error(error.message);
  const rows = (data || []).map((item) => {
    const staff = (Array.isArray(item.staff) ? item.staff[0] : item.staff) as StaffRecord;
    return { ...item, staff, derived_status: deriveStatus(item.submission_date, cycle.due_date) } as DashboardRow;
  });
  const changed = rows.filter((row) => row.status !== row.derived_status);
  if (changed.length) {
    await Promise.all(changed.map(async (row) => {
      await supabase.from("appraisal_submissions").update({ status: row.derived_status }).eq("id", row.id);
      await writeAudit("status_changed", "appraisal_submission", row.id, { from: row.status, to: row.derived_status });
    }));
  }
  return { cycle, rows };
}

export async function saveSubmission(input: { id?: string; cycleId: string; staffId: string; dueDate: string; submissionDate: string | null; rating: string | null; reviewerName: string | null; comments: string | null }) {
  const supabase = createClient();
  const status = deriveStatus(input.submissionDate, input.dueDate);
  const payload = { cycle_id: input.cycleId, staff_id: input.staffId, status, submission_date: input.submissionDate, rating: input.rating, reviewer_name: input.reviewerName, comments: input.comments };
  const { error } = input.id ? await supabase.from("appraisal_submissions").update(payload).eq("id", input.id) : await supabase.from("appraisal_submissions").insert(payload);
  if (error) throw new Error("Could not save. Please retry.");
  await writeAudit(input.id ? "submission_updated" : "submission_created", "appraisal_submission", input.id, { staff_id: input.staffId, status, submission_date: input.submissionDate, rating: input.rating });
}

export async function getStaff() {
  const { data, error } = await createClient().from("staff").select("id,employee_id,full_name,department,position").order("full_name");
  if (error) throw new Error(error.message);
  return (data || []) as StaffRecord[];
}

export async function saveStaff(input: Omit<StaffRecord, "id"> & { id?: string }) {
  const supabase = createClient();
  const payload = { employee_id: input.employee_id.trim(), full_name: input.full_name.trim(), department: input.department?.trim() || null, position: input.position?.trim() || null };
  const result = input.id ? await supabase.from("staff").update(payload).eq("id", input.id).select("id").single() : await supabase.from("staff").insert(payload).select("id").single();
  if (result.error) {
    if (result.error.code === "23505") throw new Error("Employee ID already exists.");
    throw new Error(result.error.message);
  }
  if (!input.id) {
    const { data: cycle } = await supabase.from("appraisal_cycles").select("id,due_date").eq("status", "active").limit(1).maybeSingle();
    if (cycle) {
      const { error } = await supabase.from("appraisal_submissions").insert({ cycle_id: cycle.id, staff_id: result.data.id, status: deriveStatus(null, cycle.due_date) });
      if (error) throw new Error("Staff was added, but their submission could not be created.");
    }
  }
  await writeAudit(input.id ? "staff_updated" : "staff_created", "staff", input.id || result.data.id, { employee_id: payload.employee_id, full_name: payload.full_name });
}

export async function deleteStaff(id: string) {
  const { error } = await createClient().from("staff").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit("staff_deleted", "staff", id);
}

export type CycleRecord = { id: string; name: string; start_date: string; due_date: string; status: "active" | "closed"; created_at: string };
export async function getCycles() {
  const { data, error } = await createClient().from("appraisal_cycles").select("id,name,start_date,due_date,status,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CycleRecord[];
}

export async function createCycle(input: { name: string; startDate: string; dueDate: string }) {
  const supabase = createClient();
  const { data: cycle, error } = await supabase.from("appraisal_cycles").insert({ name: input.name.trim(), start_date: input.startDate, due_date: input.dueDate, status: "closed" }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "A cycle with this name already exists." : error.message);
  const { data: staffRows } = await supabase.from("staff").select("id");
  if (staffRows?.length) {
    const { error: submissionError } = await supabase.from("appraisal_submissions").insert(staffRows.map((staff) => ({ cycle_id: cycle.id, staff_id: staff.id, status: deriveStatus(null, input.dueDate) })));
    if (submissionError) throw new Error("Cycle created, but submissions could not be initialized.");
  }
  await writeAudit("cycle_created", "appraisal_cycle", cycle.id, { name: input.name, start_date: input.startDate, due_date: input.dueDate });
  return cycle.id as string;
}

export async function activateCycle(id: string) {
  const supabase = createClient();
  const { error: closeError } = await supabase.from("appraisal_cycles").update({ status: "closed" }).eq("status", "active");
  if (closeError) throw new Error(closeError.message);
  const { error } = await supabase.from("appraisal_cycles").update({ status: "active" }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit("cycle_activated", "appraisal_cycle", id);
}

export async function writeAudit(action: string, targetType: string, targetId?: string, details: Record<string, unknown> = {}) {
  const { error } = await createClient().from("audit_log").insert({ action, target_type: targetType, target_id: targetId || null, details });
  if (error && error.code !== "42P01") console.warn("Audit log write failed", error.message);
}
