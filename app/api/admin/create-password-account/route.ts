import { NextRequest,NextResponse } from 'next/server';
import { companyResetEmail } from '@/lib/password-reset';
import { passwordPolicyError } from '@/lib/password-policy';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request:NextRequest){
  const db=await createClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return NextResponse.json({error:'Sign in is required.'},{status:401});
  const {data:membership,error:membershipError}=await db.from('team_members').select('team_id,role').eq('user_id',user.id).single();
  if(membershipError||!membership||!['owner','editor'].includes(membership.role))return NextResponse.json({error:'Only HR administrators can create employee accounts.'},{status:403});

  let body:unknown;
  try{body=await request.json();}catch{return NextResponse.json({error:'A valid employee email and temporary password are required.'},{status:400});}
  const email=companyResetEmail((body as {email?:unknown})?.email);
  const password=typeof(body as {password?:unknown})?.password==='string'?(body as {password:string}).password:'';
  if(!email)return NextResponse.json({error:'Use a valid SPSB email address.'},{status:400});
  const policyError=passwordPolicyError(password);
  if(policyError)return NextResponse.json({error:policyError},{status:400});

  const {data:staff,error:staffError}=await db.from('staff').select('id,full_name,account_activated_at').eq('team_id',membership.team_id).ilike('email',email).single();
  if(staffError||!staff)return NextResponse.json({error:'This email is not in the HR staff list.'},{status:404});
  if(staff.account_activated_at)return NextResponse.json({error:'This employee already has an active account. Use Reset password instead.'},{status:409});

  const admin=createAdminClient();
  if(!admin)return NextResponse.json({error:'HR account creation is not configured. SPSB IT must add SUPABASE_SERVICE_ROLE_KEY in Vercel.'},{status:503});
  const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listError)return NextResponse.json({error:'The employee account could not be checked. Please try again later.'},{status:502});
  const existing=list.users.find(candidate=>candidate.email?.trim().toLowerCase()===email);
  if(existing?.email_confirmed_at)return NextResponse.json({error:'This email already has an active login. Use Reset password instead.'},{status:409});

  const result=existing
    ?await admin.auth.admin.updateUserById(existing.id,{password,email_confirm:true,user_metadata:{full_name:staff.full_name}})
    :await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:staff.full_name}});
  if(result.error||!result.data.user)return NextResponse.json({error:'The employee account could not be created. Please try again later.'},{status:502});

  const now=new Date().toISOString();
  const {error:updateError}=await db.from('staff').update({account_invited_at:now,account_activated_at:now}).eq('id',staff.id);
  if(updateError)return NextResponse.json({error:'The login was created, but the staff directory could not be updated. Please refresh and contact SPSB IT if the account still appears inactive.'},{status:500});
  await db.from('audit_log').insert({team_id:membership.team_id,actor_id:user.id,action:'employee_account_created_by_hr',target_type:'staff_account',target_id:staff.id,details:{email}});
  return NextResponse.json({ok:true});
}
