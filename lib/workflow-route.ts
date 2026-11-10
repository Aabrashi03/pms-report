import type { StaffRecord, WorkflowStage } from "@/lib/data/client";

type ReportingLine = Pick<StaffRecord,"manager_email"|"hod_email"|"head_of_division_email">;

const normaliseEmail=(value?:string|null)=>value?.trim().toLowerCase()||"";

export function hasSeparateHod(staff:ReportingLine){
  const superior=normaliseEmail(staff.manager_email);
  const hod=normaliseEmail(staff.hod_email)||normaliseEmail(staff.head_of_division_email);
  return !!hod&&hod!==superior;
}

export function workflowSteps(staff:ReportingLine,currentStage?:WorkflowStage){
  const includeHod=hasSeparateHod(staff)||currentStage==="hod_endorsement";
  return [
    {key:"employee_draft" as const,label:"Employee"},
    {key:"manager_review" as const,label:includeHod?"Manager":"Assigned superior"},
    ...(includeHod?[{key:"hod_endorsement" as const,label:"HOD"}]:[]),
    {key:"hr_review" as const,label:"HR"},
    {key:"completed" as const,label:"Completed"},
  ];
}

export function stageAfterSuperior(staff:ReportingLine):WorkflowStage{
  return hasSeparateHod(staff)?"hod_endorsement":"hr_review";
}
