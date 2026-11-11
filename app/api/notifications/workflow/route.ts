import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notificationRecipients, sendWorkflowEmail, stageAction, type WorkflowStage } from "@/lib/workflow-notifications";

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
  const returned=!!reason;
  const subject=returned?`PDR returned for correction: ${staff.full_name}`:`PDR workflow update: ${staff.full_name}`;
  const action=stageAction(toStage);
  const configuredOrigin=process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin=configuredOrigin?.startsWith("https://")?configuredOrigin.replace(/\/$/,""):request.nextUrl.origin;
  const link=`${origin}/pdr?submission=${encodeURIComponent(submissionId)}`;
  const text=["SPSB Performance and Development Review",`Employee: ${staff.full_name}`,`Action required: ${action}`,returned?"The PDR has been returned. Please sign in to review the requested correction.":"Please sign in to review the PDR.",`Open the secure PDR portal: ${link}`,"This notification does not contain PDR ratings or confidential form details."].join("\n\n");
  const delivery=await sendWorkflowEmail({to:recipients,subject,text});
  return NextResponse.json(delivery);
}
