import { secondApproverEmail } from "./workflow-route.ts";

export type WorkflowStage="employee_draft"|"returned"|"manager_review"|"hod_endorsement"|"hr_review"|"completed";
export type NotificationStaff={email:string|null;manager_email:string|null;hod_email:string|null;head_of_division_email:string|null};
type WorkflowEmail={to:string[];subject:string;text:string};

const companyDomain="@selangorproperties.com.my";

export function notificationRecipients(stage:WorkflowStage,staff:NotificationStaff,hr:string){
  const values=stage==="returned"?[staff.email]:stage==="manager_review"?[staff.manager_email]:stage==="hod_endorsement"?[secondApproverEmail(staff)]:stage==="hr_review"?hr.split(","):stage==="completed"?[...hr.split(","),staff.email,staff.manager_email]:[];
  return Array.from(new Set(values.map(value=>value?.trim().toLowerCase()).filter((value):value is string=>!!value&&value.endsWith(companyDomain))));
}

export function stageAction(stage:WorkflowStage){
  if(stage==="returned")return "Employee correction required";
  if(stage==="manager_review")return "Manager review required";
  if(stage==="hod_endorsement")return "N+2 endorsement required";
  if(stage==="hr_review")return "HR final review required";
  if(stage==="completed")return "PDR completed and received by HR";
  return "Employee action required";
}

export async function sendWorkflowEmail(message:WorkflowEmail){
  try{
    const microsoft={tenant:process.env.MICROSOFT_TENANT_ID,client:process.env.MICROSOFT_CLIENT_ID,secret:process.env.MICROSOFT_CLIENT_SECRET,sender:process.env.MICROSOFT_SENDER_EMAIL};
    if(microsoft.tenant&&microsoft.client&&microsoft.secret&&microsoft.sender){
      if(!microsoft.sender.trim().toLowerCase().endsWith(companyDomain))return {sent:false,reason:"invalid_microsoft_sender"};
      return await sendWithMicrosoft(message,{tenant:microsoft.tenant,client:microsoft.client,secret:microsoft.secret,sender:microsoft.sender.trim().toLowerCase()});
    }
    const apiKey=process.env.RESEND_API_KEY,from=process.env.WORKFLOW_EMAIL_FROM;
    if(apiKey&&from)return await sendWithResend(message,{apiKey,from});
    return {sent:false,reason:"email_service_not_configured"};
  }catch{return {sent:false,reason:"email_service_unavailable"};}
}

async function sendWithMicrosoft(message:WorkflowEmail,config:{tenant:string;client:string;secret:string;sender:string}){
  const tokenResponse=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:config.client,client_secret:config.secret,scope:"https://graph.microsoft.com/.default",grant_type:"client_credentials"}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!tokenResponse.ok)return {sent:false,reason:"microsoft_authentication_failed"};
  const token=await tokenResponse.json() as {access_token?:string};
  if(!token.access_token)return {sent:false,reason:"microsoft_authentication_failed"};
  const response=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.sender)}/sendMail`,{method:"POST",headers:{Authorization:`Bearer ${token.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({message:{subject:message.subject,body:{contentType:"Text",content:message.text},toRecipients:message.to.map(address=>({emailAddress:{address}})),replyTo:[{emailAddress:{address:config.sender}}]},saveToSentItems:true}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  return response.ok?{sent:true,provider:"microsoft"}:{sent:false,reason:"microsoft_delivery_failed"};
}

async function sendWithResend(message:WorkflowEmail,config:{apiKey:string;from:string}){
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from:config.from,to:message.to,subject:message.subject,text:message.text}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  return response.ok?{sent:true,provider:"resend"}:{sent:false,reason:"resend_delivery_failed"};
}
