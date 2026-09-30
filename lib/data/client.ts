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
  return { cycle, rows };
}

export async function saveSubmission(input: { id?: string; cycleId: string; staffId: string; dueDate: string; submissionDate: string | null; rating: string | null; reviewerName: string | null; comments: string | null }) {
  const supabase = createClient();
  const status = deriveStatus(input.submissionDate, input.dueDate);
  const payload = { cycle_id: input.cycleId, staff_id: input.staffId, status, submission_date: input.submissionDate, rating: input.rating, reviewer_name: input.reviewerName, comments: input.comments };
  const { error } = input.id ? await supabase.from("appraisal_submissions").update(payload).eq("id", input.id) : await supabase.from("appraisal_submissions").insert(payload);
  if (error) throw new Error("Could not save. Please retry.");
}
