"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";
import { teamsEnabled } from "@/lib/data/team";

type Member = { user_id: string; role: string; departments: string[] };
export default function TeamPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [userId,setUserId]=useState(""); const [workspace,setWorkspace]=useState("");
  const [role,setRole]=useState(""); const [members,setMembers]=useState<Member[]>([]);
  const [memberEmail,setMemberEmail]=useState(""); const [memberRole,setMemberRole]=useState("manager");
  const [departments,setDepartments]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function load() {
    const db=createClient(); const {data:{user}}=await db.auth.getUser(); setUserId(user?.id||"");
    if(!user)return;
    const {data,error}=await db.from("team_members").select("team_id,role").eq("user_id",user.id).single();
    if(error||!data){setMessage("Your account is ready. Ask your administrator to grant company access.");return;}
    setWorkspace(data.team_id);setRole(data.role);
    const result=await db.from("team_members").select("user_id,role,departments").eq("team_id",data.team_id);
    if(result.error)throw result.error;setMembers(result.data||[]);
  }
  useEffect(()=>{if(teamsEnabled)load().catch(e=>setMessage(e.message));},[]);
  async function run(action:()=>Promise<void>){setBusy(true);setMessage("");try{await action();}catch(e){setMessage(e instanceof Error?e.message:"Could not complete this action.");}finally{setBusy(false);}}
  return <AppShell title="Team access" subtitle="One company workspace, with access matched to each colleague’s responsibilities.">
    <section className="table-card" style={{padding:24,maxWidth:850}}>
      {!teamsEnabled ? <><h2>Company access is being prepared</h2><p>Private access will be enabled after the database permissions and company administrator are configured and verified.</p></> : !userId ? <>
        <h2>Sign in to your company</h2><p>New colleagues should register and verify their email before the administrator grants access.</p>
        <form className="form-stack" onSubmit={e=>{e.preventDefault();run(async()=>{const {error}=await createClient().auth.signInWithPassword({email,password});if(error)throw error;await load();setPassword('');});}} style={{maxWidth:440}}>
          <label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Password<input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <button className="button primary" disabled={busy}>Sign in</button>
          <button type="button" className="button" disabled={busy||!email||password.length<8} onClick={()=>run(async()=>{const {error}=await createClient().auth.signUp({email,password});if(error)throw error;setMessage("Registration submitted. Check your email to verify your account, then sign in.");})}>Register account</button>
        </form></> : <>
        <h2>Company membership</h2><p>Your role: <strong>{role||"Awaiting access"}</strong>. HR and administrators manage company records. Department managers can review and export only their assigned departments.</p>
        <button className="button" disabled={busy} onClick={()=>run(async()=>{const {error}=await createClient().auth.signOut();if(error)throw error;window.location.assign("/team");})}>Sign out</button>
        {role==="owner" && <><h3>Add or update a colleague</h3><form className="form-stack" style={{maxWidth:480}} onSubmit={e=>{e.preventDefault();run(async()=>{const {error}=await createClient().rpc("set_company_member",{workspace,member_email:memberEmail,member_role:memberRole,allowed_departments:departments.split(",").map(d=>d.trim()).filter(Boolean)});if(error)throw error;await load();setMessage("Company access saved.");});}}>
          <label>Verified email<input type="email" required value={memberEmail} onChange={e=>setMemberEmail(e.target.value)}/></label>
          <label>Access<select value={memberRole} onChange={e=>setMemberRole(e.target.value)}><option value="manager">Department manager — view and export</option><option value="editor">HR — manage company records</option><option value="viewer">Management — view all departments</option></select></label>
          {memberRole==="manager"&&<label>Departments (exact names, separated by commas)<input required placeholder="Finance, Operations" value={departments} onChange={e=>setDepartments(e.target.value)}/></label>}
          <button className="button primary" disabled={busy}>Save access</button>
        </form><h3>Members</h3><ul>{members.map(m=><li key={m.user_id} style={{marginBottom:12,overflowWrap:"anywhere"}}>{m.user_id===userId?"You":m.user_id} · {m.role}{m.departments.length?` · ${m.departments.join(", ")}`:""} {m.role!=="owner"&&<button className="button" disabled={busy} onClick={()=>run(async()=>{const {error}=await createClient().rpc("remove_company_member",{workspace,member_id:m.user_id});if(error)throw error;await load();})}>Remove access</button>}</li>)}</ul></>}
      </>}
      {message&&<p role="status" style={{marginTop:20}}>{message}</p>}
    </section>
  </AppShell>;
}
