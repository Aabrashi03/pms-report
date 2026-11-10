import type { StaffRecord, WorkflowStage } from "@/lib/data/client";

type ReportingLine = Pick<StaffRecord,"manager_email"|"hod_email"|"head_of_division_email">;

const normaliseEmail=(value?:string|null)=>value?.trim().toLowerCase()||"";

export function hasSeparateHod(staff:ReportingLine){
  return !!secondApproverEmail(staff);
}

export function secondApproverEmail(staff:ReportingLine){
  const superior=normaliseEmail(staff.manager_email);
  const divisionHead=normaliseEmail(staff.head_of_division_email);
  const hod=normaliseEmail(staff.hod_email);
  if(divisionHead&&divisionHead!==superior)return divisionHead;
  if(hod&&hod!==superior)return hod;
  return "";
}

export function firstApproverLabel(staff:ReportingLine){
  if(!hasSeparateHod(staff))return "Assigned superior (N+1)";
  const superior=normaliseEmail(staff.manager_email);
  const divisionHead=normaliseEmail(staff.head_of_division_email);
  return divisionHead&&divisionHead!==superior?"Manager / HOD (N+1)":"Manager (N+1)";
}

export function secondApproverLabel(staff:ReportingLine){
  const superior=normaliseEmail(staff.manager_email);
  const divisionHead=normaliseEmail(staff.head_of_division_email);
  return divisionHead&&divisionHead!==superior?"Head of Division (N+2)":"HOD (N+2)";
}

export function workflowSteps(staff:ReportingLine,currentStage?:WorkflowStage){
  const includeHod=hasSeparateHod(staff)||currentStage==="hod_endorsement";
  return [
    {key:"employee_draft" as const,label:"Employee"},
    {key:"manager_review" as const,label:firstApproverLabel(staff)},
    ...(includeHod?[{key:"hod_endorsement" as const,label:secondApproverLabel(staff)}]:[]),
    {key:"completed" as const,label:"Completed / HR received"},
  ];
}

export function stageAfterSuperior(staff:ReportingLine):WorkflowStage{
  return hasSeparateHod(staff)?"hod_endorsement":"completed";
}
