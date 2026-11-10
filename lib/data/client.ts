import { getCompanyAccess, requireTeamId, requireCompanyEditor } from "./team";
import { createClient } from "@/lib/supabase/client";
import { deriveStatus, type SubmissionStatus } from "./types";
import { hasSeparateHod } from "@/lib/workflow-route";

export type StaffRecord = { id: string; employee_id: string; full_name: string; email: string | null; department: string | null; position: string | null; manager_email: string | null; hod_name: string | null; hod_email?: string | null; head_of_division: string | null; head_of_division_email?: string | null; is_manager: boolean; is_confirmation_staff: boolean; account_invited_at?: string | null; account_activated_at?: string | null };
export type WorkflowStage = "employee_draft" | "returned" | "manager_review" | "hod_endorsement" | "hr_review" | "completed";
export type SubmissionRecord = { id: string; cycle_id: string; staff_id: string; status: SubmissionStatus; submission_date: string | null; rating: string | null; reviewer_name: string | null; comments: string | null; workflow_stage?: WorkflowStage; employee_submitted_at?: string | null; manager_submitted_at?: string | null; hod_endorsed_at?: string | null; hr_reviewed_at?: string | null; form_data?: Record<string, unknown> | null };
export type DashboardRow = SubmissionRecord & { staff: StaffRecord; derived_status: SubmissionStatus };

export async function getActiveCycleDashboard() {
  const supabase = createClient();
  const teamId = await requireTeamId();
  const { data: cycle, error: cycleError } = await supabase.from("appraisal_cycles").select("id,name,due_date").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cycleError) throw new Error(cycleError.message);
  if (!cycle) return { cycle: null, rows: [] as DashboardRow[] };
  const { data, error } = await supabase.from("appraisal_submissions").select("id,cycle_id,staff_id,status,submission_date,rating,reviewer_name,comments,workflow_stage,employee_submitted_at,manager_submitted_at,hod_endorsed_at,hr_reviewed_at,form_data,staff!appraisal_submissions_staff_id_fkey!inner(id,employee_id,full_name,email,department,position,manager_email,hod_name,hod_email,head_of_division,head_of_division_email,is_manager,is_confirmation_staff)").eq("cycle_id", cycle.id);
  if (error) throw new Error(error.message);
  const rows = (data || []).map((item) => {
    const staff = (Array.isArray(item.staff) ? item.staff[0] : item.staff) as StaffRecord;
    return { ...item, staff, derived_status: deriveStatus(item.submission_date, cycle.due_date) } as DashboardRow;
  });
  return { cycle, rows };
}

export async function savePdrForm(id: string, formData: Record<string, unknown>, workflowStage: WorkflowStage = "employee_draft", overallRating?: number | null, returnReason = "", saveMode:"manual"|"auto"="manual") {
  const supabase = createClient();
  await requireTeamId();
  const access = await getCompanyAccess();
  const { data: existing, error: existingError } = await supabase.from("appraisal_submissions").select("form_data,workflow_stage,staff!appraisal_submissions_staff_id_fkey!inner(manager_email,hod_email,head_of_division_email)").eq("id", id).single();
  if (existingError || !existing) throw new Error("The PDR form could not be loaded for saving.");
  const currentStage=(existing.workflow_stage||"employee_draft") as WorkflowStage;
  const role=access?.role;
  const isHr=role==="owner"||role==="editor";
  const reportingLine=(Array.isArray(existing.staff)?existing.staff[0]:existing.staff) as Pick<StaffRecord,"manager_email"|"hod_email"|"head_of_division_email">;
  const separateHod=hasSeparateHod(reportingLine);
  const permittedStages:Partial<Record<NonNullable<typeof role>,WorkflowStage[]>>={employee:["employee_draft","returned","manager_review"],manager:["returned","manager_review","hod_endorsement","hr_review"],hod:["manager_review","hod_endorsement","hr_review"],owner:["employee_draft","returned","manager_review","hod_endorsement","hr_review","completed"],editor:["employee_draft","returned","manager_review","hod_endorsement","hr_review","completed"]};
  if(!role||!permittedStages[role]?.includes(workflowStage)) throw new Error("Your role cannot move this PDR to the selected stage.");
  if(role==="manager"&&workflowStage==="hr_review"&&separateHod) throw new Error("This PDR must be endorsed by the assigned HOD before HR review.");
  if(!isHr&&((role==="employee"&&!(["employee_draft","returned"] as WorkflowStage[]).includes(currentStage))||(role==="manager"&&currentStage!=="manager_review")||(role==="hod"&&currentStage!=="hod_endorsement"))) throw new Error("This PDR is read-only at the current workflow stage.");
  const safeForm=isHr?formData:restrictPdrChanges(existing.form_data as Record<string,unknown>||{},formData,role);
  const now = new Date();
  const stageTimestamps: Partial<SubmissionRecord> = workflowStage === "manager_review"
    ? { employee_submitted_at: now.toISOString(), submission_date: now.toISOString().slice(0,10) }
    : currentStage === "manager_review" && (workflowStage === "hod_endorsement" || workflowStage === "hr_review") ? { manager_submitted_at: now.toISOString() }
    : currentStage === "hod_endorsement" && workflowStage === "hr_review" ? { hod_endorsed_at: now.toISOString() }
    : workflowStage === "completed" ? { hr_reviewed_at: now.toISOString() }
    : {};
  const payload = { form_data: safeForm, workflow_stage: workflowStage, rating: overallRating == null ? null : overallRating.toFixed(2), updated_at: now.toISOString(), ...stageTimestamps };
  const { error } = await supabase.from("appraisal_submissions").update(payload).eq("id", id);
  if (error) throw new Error("The PDR form could not be saved. Please retry.");
  if(saveMode==="manual")await writeAudit(returnReason?"pdr_returned":"pdr_form_saved", "appraisal_submission", id, { workflow_stage: workflowStage, from_stage: currentStage, ...(returnReason?{reason:returnReason}:{}) });
  let notificationSent:boolean|null=null;
  if(workflowStage!==currentStage){
    try{
      const response=await fetch("/api/notifications/workflow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({submissionId:id,fromStage:currentStage,toStage:workflowStage,reason:returnReason})});
      const result=await response.json() as {sent?:boolean}; notificationSent=!!result.sent;
    }catch{notificationSent=false;}
  }
  return {notificationSent};
}

function restrictPdrChanges(current:Record<string,unknown>,incoming:Record<string,unknown>,role:"employee"|"manager"|"hod"|"viewer"){
  if(role==="viewer") return current;
  const object=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const basePart=object(current.particulars),nextPart=object(incoming.particulars),baseSign=object(current.signatures),nextSign=object(incoming.signatures);
  const dateKeys=["pdrDate","kpiFrom","kpiTo"];
  const particulars={...basePart,...Object.fromEntries(dateKeys.map(key=>[key,nextPart[key]??basePart[key]]))};
  if(role==="hod") return {...current,particulars,signatures:{...baseSign,hodDate:nextSign.hodDate??baseSign.hodDate}};
  const mergeRatings=(baseValue:unknown,nextValue:unknown)=>{
    const base=Array.isArray(baseValue)?baseValue:[],next=Array.isArray(nextValue)?nextValue:[];
    return base.map((item,index)=>{const oldRow=object(item),newRow=object(next[index]);return role==="employee"?{...oldRow,employee:newRow.employee??oldRow.employee,comments:newRow.comments??oldRow.comments}:{...oldRow,manager:newRow.manager??oldRow.manager,comments:newRow.comments??oldRow.comments};});
  };
  return {...current,particulars,sectionA:mergeRatings(current.sectionA,incoming.sectionA),sectionB:mergeRatings(current.sectionB,incoming.sectionB),reflection:incoming.reflection??current.reflection,nextKpis:incoming.nextKpis??current.nextKpis,training:incoming.training??current.training,signatures:{...baseSign,[role==="employee"?"employeeDate":"managerDate"]:nextSign[role==="employee"?"employeeDate":"managerDate"]??baseSign[role==="employee"?"employeeDate":"managerDate"]}};
}

export async function saveSubmission(input: { id?: string; cycleId: string; staffId: string; dueDate: string; submissionDate: string | null; rating: string | null; reviewerName: string | null; comments: string | null }) {
  await requireCompanyEditor();
  const supabase = createClient();
  const teamId = await requireTeamId();
  const status = deriveStatus(input.submissionDate, input.dueDate);
  const payload = { ...(teamId ? { team_id: teamId } : {}), cycle_id: input.cycleId, staff_id: input.staffId, status, submission_date: input.submissionDate, rating: input.rating, reviewer_name: input.reviewerName, comments: input.comments };
  const { error } = input.id ? await supabase.from("appraisal_submissions").update(payload).eq("id", input.id) : await supabase.from("appraisal_submissions").insert(payload);
  if (error) throw new Error("Could not save. Please retry.");
  await writeAudit(input.id ? "submission_updated" : "submission_created", "appraisal_submission", input.id, { staff_id: input.staffId, status, submission_date: input.submissionDate, rating: input.rating });
}

export async function getStaff() {
  await requireTeamId();
  const { data, error } = await createClient().from("staff").select("id,employee_id,full_name,email,department,position,manager_email,hod_name,head_of_division,is_manager,is_confirmation_staff,account_invited_at,account_activated_at").order("full_name");
  if (error) throw new Error(error.message);
  return (data || []) as StaffRecord[];
}

export async function saveStaff(input: Omit<StaffRecord, "id"> & { id?: string }) {
  await requireCompanyEditor();
  const supabase = createClient();
  const teamId = await requireTeamId();
  const payload = { ...(teamId ? { team_id: teamId } : {}), employee_id: input.employee_id.trim(), full_name: input.full_name.trim(), email: input.email?.trim().toLowerCase() || null, department: input.department?.trim() || null, position: input.position?.trim() || null, manager_email: input.manager_email?.trim().toLowerCase() || null, hod_name: input.hod_name?.trim() || null, head_of_division: input.head_of_division?.trim() || null, is_manager: input.is_manager, is_confirmation_staff: input.is_confirmation_staff };
  const result = input.id ? await supabase.from("staff").update(payload).eq("id", input.id).select("id").single() : await supabase.from("staff").insert(payload).select("id").single();
  if (result.error) {
    if (result.error.code === "23505") throw new Error("Employee ID or SPSB email already exists.");
    throw new Error(result.error.message);
  }
  if (!input.id) {
    const { data: cycle } = await supabase.from("appraisal_cycles").select("id,due_date").eq("status", "active").limit(1).maybeSingle();
    if (cycle) {
      const { error } = await supabase.from("appraisal_submissions").insert({ ...(teamId ? { team_id: teamId } : {}), cycle_id: cycle.id, staff_id: result.data.id, status: deriveStatus(null, cycle.due_date) });
      if (error) throw new Error("Staff was added, but their submission could not be created.");
    }
  }
  await writeAudit(input.id ? "staff_updated" : "staff_created", "staff", input.id || result.data.id, { employee_id: payload.employee_id, full_name: payload.full_name });
}

export async function deleteStaff(id: string) {
  await requireCompanyEditor();
  await requireTeamId();
  const { error } = await createClient().from("staff").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit("staff_deleted", "staff", id);
}

export type CycleRecord = { id: string; name: string; start_date: string; due_date: string; status: "active" | "closed"; created_at: string };
export async function getCycles() {
  await requireTeamId();
  const { data, error } = await createClient().from("appraisal_cycles").select("id,name,start_date,due_date,status,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CycleRecord[];
}

export async function createCycle(input: { name: string; startDate: string; dueDate: string }) {
  await requireCompanyEditor();
  const supabase = createClient();
  const teamId = await requireTeamId();
  const { data: cycle, error } = await supabase.from("appraisal_cycles").insert({ ...(teamId ? { team_id: teamId } : {}), name: input.name.trim(), start_date: input.startDate, due_date: input.dueDate, status: "closed" }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "A cycle with this name already exists." : error.message);
  const { data: staffRows } = await supabase.from("staff").select("id");
  if (staffRows?.length) {
    const { error: submissionError } = await supabase.from("appraisal_submissions").insert(staffRows.map((staff) => ({ ...(teamId ? { team_id: teamId } : {}), cycle_id: cycle.id, staff_id: staff.id, status: deriveStatus(null, input.dueDate) })));
    if (submissionError) throw new Error("Cycle created, but submissions could not be initialized.");
  }
  await writeAudit("cycle_created", "appraisal_cycle", cycle.id, { name: input.name, start_date: input.startDate, due_date: input.dueDate });
  return cycle.id as string;
}

export async function activateCycle(id: string) {
  await requireCompanyEditor();
  const supabase = createClient();
  const teamId = await requireTeamId();
  const { error: closeError } = await supabase.from("appraisal_cycles").update({ status: "closed" }).eq("status", "active");
  if (closeError) throw new Error(closeError.message);
  const { error } = await supabase.from("appraisal_cycles").update({ status: "active" }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit("cycle_activated", "appraisal_cycle", id);
}

export async function writeAudit(action: string, targetType: string, targetId?: string, details: Record<string, unknown> = {}) {
  const teamId = await requireTeamId();
  const { data: { user } } = await createClient().auth.getUser();
  const { error } = await createClient().from("audit_log").insert({ ...(teamId ? { team_id: teamId } : {}), actor_id: user?.id || null, action, target_type: targetType, target_id: targetId || null, details });
  if (error && error.code !== "42P01") console.warn("Audit log write failed", error.message);
}
