"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { teamsEnabled } from '@/lib/data/team';
import { safeAuthDestination } from '@/lib/auth-redirect';
import './login.css';

type Mode = 'signin'|'register'|'forgot';
export default function LoginPage() {
  const [mode,setMode]=useState<Mode>('signin');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [checking,setChecking]=useState(true);
  const [signedIn,setSignedIn]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get('mode')==='register')setMode('register');
    if(params.get('mode')==='forgot')setMode('forgot');
    if(params.get('error')==='company-account')setError('Access is limited to SPSB Microsoft accounts ending in @selangorproperties.com.my.');
    else if(params.has('error'))setError('That sign-in link could not be verified. Please sign in again or request a new link.');
    const auth=createClient().auth;
    const finish=async()=>{
      const hash=new URLSearchParams(window.location.hash.slice(1));
      const linkType=hash.get('type');
      const accessToken=hash.get('access_token');
      const refreshToken=hash.get('refresh_token');
      if((linkType==='invite'||linkType==='recovery')&&accessToken&&refreshToken){
        const {error:sessionError}=await auth.setSession({access_token:accessToken,refresh_token:refreshToken});
        if(sessionError){setError('That account link has expired or could not be verified. Request a new password-reset link.');setChecking(false);return;}
        window.history.replaceState({},'',`${window.location.pathname}${window.location.search}`);
        window.location.replace('/reset-password');
        return;
      }
      try { const {data}=await auth.getUser();setSignedIn(data.user?.email||''); }
      catch { setError('Could not check your session. Please try again.'); }
      finally { setChecking(false); }
    };
    void finish();
  },[]);
  function switchMode(value:Mode){setMode(value);setShow(false);setPassword('');setConfirm('');setError('');setMessage('');}
  async function submit(event:React.FormEvent){
    event.preventDefault();setError('');setMessage('');
    if(mode==='register'&&password!==confirm){setError('The passwords do not match.');return;}
    setBusy(true);
    try {
      const auth=createClient().auth;
      if(mode==='signin'){
        const result=await auth.signInWithPassword({email:email.trim(),password});
        if(result.error){setError('Could not sign in. If this is your first visit, choose Create an account below. Otherwise check your password and confirm your email.');return;}
        setPassword('');
        const next=new URLSearchParams(window.location.search).get('next');
        window.location.assign(teamsEnabled?safeAuthDestination(next):'/team');
      } else if(mode==='register'){
        const {data,error:failure}=await auth.signUp({email:email.trim(),password,options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/team`}});
        if(failure){setError('Registration could not be completed. Please try again later or contact your administrator.');return;}
        setPassword('');setConfirm('');
        if(data.session){setSignedIn(data.user?.email||email);setMessage('Account created. Company access must be assigned by your administrator.');}
        else setMessage('If registration is available for this address, check your email to confirm your account. You will then need company access from your administrator.');
      } else {
        const {error:failure}=await auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`});
        if(failure){setError('Unable to request a reset link right now. Please try again later.');return;}
        setMessage('If an account exists for this address, a password-reset email will arrive shortly. Open it in this browser.');
      }
    }catch{setError('We could not connect. Check your connection and try again.');}finally{setBusy(false);}
  }
  async function signOut(){setBusy(true);setError('');try{const {error:failure}=await createClient().auth.signOut();if(failure)throw failure;setSignedIn('');setPassword('');setConfirm('');setMessage('You have signed out.');}catch{setError('Could not sign out. Please try again.');}finally{setBusy(false);}}
  return <main className="login-screen"><section className="login-story"><Link href="/" className="login-brand"><span className="login-logo-frame"><img src="/spb-logo.png" alt="SPB"/></span><span className="login-brand-copy"><strong>Selangor Properties</strong><small>Performance &amp; Development Review</small></span></Link><div className="login-story-copy"><p className="login-eyebrow">People · Performance · Progress</p><h1>Performance reviews,<br/>made clear.</h1><p>A secure workspace for employees, managers and HR to complete, review and monitor the year-end PDR process.</p><div className="login-assurance"><span>✓ Role-based access</span><span>✓ Secure employee records</span><span>✓ Online review workflow</span></div></div><small>Authorised SPSB employees only</small></section><section className="login-panel"><div className="login-card"><div className="login-mobile-logo"><img src="/spb-logo.png" alt="SPB"/><span><strong>Selangor Properties</strong><small>PDR Portal</small></span></div><p className="login-eyebrow">SPSB employee portal</p><h2>{signedIn?'You are signed in':mode==='register'?'Create your account':mode==='forgot'?'Reset your password':'Welcome back'}</h2>
    {!teamsEnabled&&<p className="login-notice">Accounts can be set up now. Private company access is still awaiting activation; the current app remains a public demo.</p>}
    {checking?<p role="status">Checking your session…</p>:signedIn?<><p>Signed in as <strong className="login-email">{signedIn}</strong>.</p><Link className="login-primary" href={teamsEnabled?'/':'/team'}>{teamsEnabled?'Open workspace':'View access status'}</Link><button className="login-text" disabled={busy} onClick={signOut}>Sign out</button></>:<>
      <p className="login-description">{mode==='signin'?'Enter your company email and password to continue.':mode==='register'?'Use your company email to create your portal account. HR will assign access according to your role.':'Enter your company email and we will send you a secure reset link.'}</p>
      <form onSubmit={submit} className="login-form"><label>Email address<input type="email" required autoComplete="email" value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="name@selangorproperties.com.my"/></label>
      {mode!=='forgot'&&<><label>Password<span className="login-password"><input type={show?'text':'password'} required minLength={mode==='register'?12:undefined} autoComplete={mode==='register'?'new-password':'current-password'} value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></span></label>{mode==='register'&&<><small>Use at least 12 characters.</small><label>Confirm password<input type="password" required minLength={12} autoComplete="new-password" value={confirm} disabled={busy} onChange={e=>setConfirm(e.target.value)}/></label></>}</>}
      {mode==='signin'&&<button type="button" className="login-text forgot-link" disabled={busy} onClick={()=>switchMode('forgot')}>Forgot password?</button>}
      <button className="login-primary" disabled={busy}>{busy?'Please wait…':mode==='register'?'Create account':mode==='forgot'?'Send reset link':'Sign in securely'}</button></form>
      <div className="login-switch">{mode==='signin'?<>First time here? <button className="login-text" disabled={busy} onClick={()=>switchMode('register')}>Create an account</button></>:<button className="login-text" disabled={busy} onClick={()=>switchMode('signin')}>Back to sign in</button>}</div>
    </>}
    {error&&<p className="login-error" role="alert">{error}</p>}{message&&<p className="login-message" role="status">{message}</p>}
    <footer><strong>Need help?</strong> Contact HR for account access or assistance.</footer></div><p className="login-privacy">Internal SPSB system · Your access is based on your assigned role.</p></section></main>;
}

