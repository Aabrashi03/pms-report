"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { teamsEnabled, getCompanyAccess, type CompanyAccess } from '@/lib/data/team';
import { createClient } from '@/lib/supabase/client';
import { canOpenWorkspacePath, visibleWorkspacePaths } from '@/lib/role-navigation';

const nav = [
  ["/", "Dashboard", "▦"], ["/pdr", "PDR form", "▤"], ["/staff", "Staff", "♙"], ["/cycles", "Cycles", "◷"], ["/reports", "Reports", "↗"], ["/team", "Team access", "♙"],
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [access,setAccess] = useState<CompanyAccess|null>(null);
  const [accessError,setAccessError] = useState('');
  const [checking,setChecking] = useState(teamsEnabled);
  const [signedIn,setSignedIn] = useState(false);
  const [userEmail,setUserEmail] = useState('');
  const [signingOut,setSigningOut] = useState(false);
  useEffect(()=>{
    if(!teamsEnabled) return;
    let active=true;
    setChecking(true);
    const auth=createClient().auth;
    auth.getUser().then(({data})=>{if(active){setSignedIn(!!data.user);setUserEmail(data.user?.email||'');}});
    getCompanyAccess().then(value=>{if(active){setAccess(value);setAccessError('');}}).catch(error=>{if(active){setAccess(null);setAccessError(error.message);}}).finally(()=>{if(active)setChecking(false);});
    return ()=>{active=false;};
  },[pathname]);
  async function signOut(){
    setSigningOut(true);
    const {error}=await createClient().auth.signOut();
    if(error){setAccessError('Could not sign out. Please try again.');setSigningOut(false);return;}
    window.location.assign('/login');
  }
  const scope = access?.role === 'employee' ? 'Your PDR only' : access?.role === 'manager' ? 'Your assigned employees' : access?.role === 'hod' ? 'Your endorsement queue' : 'Company-wide';
  const userName=userEmail?userEmail.split('@')[0].split(/[._-]/).filter(Boolean).map(part=>part[0].toUpperCase()+part.slice(1)).join(' '):'Company user';
  const roleLabel=access?.role==='owner'?'Administrator':access?.role==='editor'?'HR administrator':access?.role==='viewer'?'Management viewer':access?.role==='manager'?'Manager':access?.role==='hod'?'Head of Department':access?.role==='employee'?'Employee':'Company access';
  const userInitials=userName.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();
  const visiblePaths = visibleWorkspacePaths(access?.role);
  const visibleNav = nav.filter(([href])=>visiblePaths.includes(href));
  const routeAllowed = !teamsEnabled || canOpenWorkspacePath(access?.role,pathname);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const sync = () => { setMobile(query.matches); if (!query.matches) setOpen(false); };
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>("a[href], button, select, input, [tabindex='0']") ?? []).filter(el => !el.hasAttribute("disabled"));
    controls()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key === "Tab") {
        const items = controls(); const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); menuButton.current?.focus(); };
  }, [open, mobile]);
  return <div className="app-frame">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside ref={sidebar} id="main-navigation" className={`sidebar ${open ? "sidebar-open" : ""}`} inert={mobile && !open} aria-label="Workspace navigation">
      <button className="icon-button navigation-close" aria-label="Close navigation" onClick={() => setOpen(false)}>×</button>
      <div className="brand"><span className="brand-mark brand-logo"><img src="/spb-logo.png" alt="SPB"/></span><span><strong>SPSB PDR</strong><small>Performance review portal</small></span></div>
      <nav aria-label="Main navigation">{visibleNav.map(([href, label, icon]) => <Link href={href} key={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""}><span aria-hidden>{icon}</span>{access?.role==='employee'&&href==='/pdr'?'My PDR':label}</Link>)}</nav>
      {signedIn?<button type="button" className="button" disabled={signingOut} onClick={signOut}>{signingOut?'Signing out…':'Sign out'}</button>:<Link href="/login" className="button" onClick={() => setOpen(false)}>Sign in</Link>}<div className="sidebar-note"><span className="live-dot" />{teamsEnabled?'2026 PDR workspace':'Demo workspace'}<small>{teamsEnabled ? (access?scope:'Sign in to view your access') : 'Connected to demo appraisal data'}</small></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />}
    <div className="content-frame" inert={mobile && open}>
      <div className="mobile-masthead"><button ref={menuButton} className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation" aria-controls="main-navigation" aria-expanded={open}>☰</button><div><strong>SPSB PDR Portal</strong><small>{teamsEnabled?'2026 year-end review':'Demo appraisal workspace'}</small></div><span className="masthead-badge">{teamsEnabled?'PDR':'DEMO'}</span></div>
      <header className="topbar"><div className="page-title"><p className="eyebrow">Performance &amp; development review</p><h1>{title}</h1><p>{subtitle}</p></div><div className="user-chip"><span>{userInitials||'HR'}</span><div><strong>{userName}</strong><small>{teamsEnabled?roleLabel:'Demo mode'}</small></div></div></header>
      <main id="main-content" tabIndex={-1} className="page-content">
        {teamsEnabled ? checking ? <div className="state-card">Checking company access…</div> : accessError ? <div className="state-card"><h2>Company access required</h2><p>{accessError}</p><Link className="button" href="/login">Return to sign in</Link></div> : !routeAllowed ? <div className="state-card"><h2>Page not available</h2><p>Your company role does not permit access to this page.</p><Link className="button" href={access?.role==='employee'?'/pdr':'/'}>Open your workspace</Link></div> : <><p className="scope-banner">{scope}{access && ['manager','viewer'].includes(access.role)?' · Read-only access; contact HR for updates.':''}</p>{children}</> : children}
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation" inert={mobile&&open}>{visibleNav.map(([href,label,icon])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}><span aria-hidden>{icon}</span>{access?.role==='employee'&&href==='/pdr'?'My PDR':label==='Dashboard'?'Overview':label==='Team access'?'Team':label}</Link>)}</nav>
  </div>;
}
