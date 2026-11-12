"use client";
import { useState } from 'react';
import type { StaffRecord } from '@/lib/data/client';
import { passwordPolicyError } from '@/lib/password-policy';
import { PasswordRequirements } from '@/components/password-requirements';

export function StaffPasswordForm({staff,onClose,onCreated}:{staff:StaffRecord;onClose:()=>void;onCreated:()=>Promise<void>}){
  const[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:React.FormEvent){
    event.preventDefault();setError('');
    const policyError=passwordPolicyError(password);if(policyError){setError(policyError);return;}
    if(password!==confirm){setError('The passwords do not match.');return;}
    setBusy(true);
    try{
      const response=await fetch('/api/admin/create-password-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:staff.email,password})});
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error||'The employee account could not be created.');
      setPassword('');setConfirm('');await onCreated();
    }catch(cause){setError(cause instanceof Error?cause.message:'The employee account could not be created.');setBusy(false);}
  }
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="staff-password-title"><button className="modal-dismiss" onClick={onClose} aria-label="Close"/><section className="drawer"><div className="drawer-header"><div><p className="eyebrow">HR account setup</p><h2 id="staff-password-title">Create employee login</h2><p>Create a temporary password for {staff.full_name}. The password is sent directly to Supabase and is not stored in the staff directory.</p></div><button className="icon-button" onClick={onClose}>×</button></div><form className="form-stack form-offset" onSubmit={submit}><label>SPSB email<input value={staff.email||''} readOnly/></label><label>Temporary password<span className="password-field"><input type={show?'text':'password'} required minLength={8} autoComplete="new-password" value={password} disabled={busy} onChange={event=>setPassword(event.target.value)}/><button type="button" onClick={()=>setShow(value=>!value)}>{show?'Hide':'Show'}</button></span></label><PasswordRequirements password={password}/><label>Confirm temporary password<input type="password" required minLength={8} autoComplete="new-password" value={confirm} disabled={busy} onChange={event=>setConfirm(event.target.value)}/></label><p className="form-guidance"><strong>Important:</strong> Provide the temporary password to the employee securely. HR should not retain a copy.</p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={busy}>{busy?'Creating…':'Create account'}</button></div></form></section></div>;
}
