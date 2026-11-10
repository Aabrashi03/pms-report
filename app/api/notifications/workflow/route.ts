import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { secondApproverEmail } from "@/lib/workflow-route";

type WorkflowStage="employee_draft"|"returned"|"manager_review"|"hod_endorsement"|"hr_review"|"completed";
const validStages=new Set<WorkflowStage>(["employee_draft","returned","manager_review","hod_endorsement","hr_review","completed"]);

export async function POST(request:NextRequest){
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in is required."},{status:401});
  let body:{submissionId?:unknown;fromStage?:unknown;toStage?:unknown;reason?:unknown};
  try{body=await request.json();}catch{return NextResponse.json({error:"Invalid notification request."},{status:400});}
  const submissionId=typeof body.submissionId==="string"?body.submissionId:"";
  const fromStage=typeof body.fromStage==="string"&&validStages.has(body.fromStage as WorkflowStage)?body.fromStage as WorkflowStage:null;
  const toStage=typeof body.toStage==="string"&&validStages.has(body.toStage as WorkflowStage)?body.toStage as WorkflowStage:null;
  const reason=typeof body.reason==="string"?body.reason.trim().slice(0,1000):"";
  if(!submissionId||!fromStage||!toStage)return NextResponse.json({error:"Invalid workflow change."},{status:400});
  const {data:submission,error}=await db.from("appraisal_submissions").select("id,workflow_stage,staff!appraisal_submissions_staff_id_fkey!inner(full_name,email,manager_email,hod_email,head_of_division_email)").eq("id",submissionId).single();
  if(error||!submission||submission.workflow_stage!==toStage)return NextResponse.json({error:"The workflow change could not be verified."},{status:403});
  const staff=(Array.isArray(submission.staff)?submission.staff[0]:submission.staff) as {full_name:string;email:string|null;manager_email:string|null;hod_email:string|null;head_of_division_email:string|null};
  const recipients=notificationRecipients(toStage,staff,process.env.HR_NOTIFICATION_EMAIL||"");
  if(!recipients.length)return NextResponse.json({sent:false,reason:"recipient_not_configured"});
  const apiKey=process.env.RESEND_API_KEY,from=process.env.WORKFLOW_EMAIL_FROM;
  if(!apiKey||!from)return NextResponse.json({sent:false,reason:"email_service_not_configured"});
  const returned=!!reason;
  const subject=returned?`PDR returned for correction: ${staff.full_name}`:`PDR workflow update: ${staff.full_name}`;
  const action=stageAction(toStage);
  const link=`${request.nextUrl.origin}/pdr?submission=${encodeURIComponent(submissionId)}`;
  const text=[`Performance and Development Review: ${staff.full_name}`,`Current action: ${action}`,reason?`Correction requested: ${reason}`:"",`Open the PDR: ${link}`].filter(Boolean).join("\n\n");
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:recipients,subject,text})});
  if(!response.ok)return NextResponse.json({sent:false,reason:"delivery_failed"});
  return NextResponse.json({sent:true});
}

function notificationRecipients(stage:WorkflowStage,staff:{email:string|null;manager_email:string|null;hod_email:string|null;head_of_division_email:string|null},hr:string){
  const values=stage==="returned"?[staff.email]:stage==="manager_review"?[staff.manager_email]:stage==="hod_endorsement"?[secondApproverEmail(staff)]:stage==="hr_review"?hr.split(","):stage==="completed"?[staff.email,staff.manager_email]:[];
  return Array.from(new Set(values.map(value=>value?.trim().toLowerCase()).filter((value):value is string=>!!value&&value.endsWith("@selangorproperties.com.my"))));
}

function stageAction(stage:WorkflowStage){
  if(stage==="returned")return "Employee correction required";
  if(stage==="manager_review")return "Manager review required";
  if(stage==="hod_endorsement")return "HOD endorsement required";
  if(stage==="hr_review")return "HR final review required";
  if(stage==="completed")return "PDR completed";
  return "Employee action required";
}
