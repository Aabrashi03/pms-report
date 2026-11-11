"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { teamsEnabled, getCompanyAccess, type CompanyAccess } from '@/lib/data/team';
import { createClient } from '@/lib/supabase/client';
import { canOpenWorkspacePath, visibleWorkspacePaths } from '@/lib/role-navigation';

const nav = [
  ["/", "Dashboard", "dashboard"], ["/pdr", "PDR form", "form"], ["/staff", "Staff", "staff"], ["/cycles", "PDR cycle", "cycle"], ["/reports", "Reports", "report"], ["/team", "User access", "access"],
] as const;

function NavIcon({name}:{name:typeof nav[number][2]}) {
  const common={viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  if(name==="dashboard")return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  if(name==="form")return <svg {...common}><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>;
  if(name==="staff")return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M14 15c3.5-.5 5.5 1.2 6 4"/></svg>;
  if(name==="cycle")return <svg {...common}><path d="M20 7V3l-2 2a8 8 0 1 0 2 8"/><path d="M12 7v5l3 2"/></svg>;
  if(name==="report")return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
  return <svg {...common}><circle cx="8" cy="8" r="3"/><path d="M3 20c.5-4 2.2-6 5-6 2 0 3.5 1 4.3 3M16 11v8M12 15h8"/></svg>;
}

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
  const navigationLabel = (href:string,label:string) => {
    if(href==='/pdr'&&access?.role==='employee') return 'My PDR';
    if(href==='/staff'&&['manager','hod'].includes(access?.role||'')) return 'Team Reviews';
    return label;
  };
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
      <button className="icon-button navigation-close" aria-label="Close navigation" onClick={() => setOpen(false)}><span aria-hidden>×</span><span>Close</span></button>
      <div className="brand"><span className="brand-mark brand-logo"><img src="/spb-logo.png" alt="SPB"/></span><span><strong>SPSB PDR</strong><small>Performance review portal</small></span></div>
      <nav aria-label="Main navigation">{visibleNav.map(([href, label, icon]) => <Link href={href} key={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""}><span aria-hidden><NavIcon name={icon}/></span>{navigationLabel(href,label)}</Link>)}</nav>
      {signedIn&&<div className="sidebar-account"><span>{userInitials||'HR'}</span><div><strong>{userName}</strong><small>{roleLabel}</small></div></div>}
      {signedIn?<button type="button" className="button sidebar-signout" disabled={signingOut} onClick={signOut}>{signingOut?'Signing out…':'Sign out'}</button>:<Link href="/login" className="button sidebar-signout" onClick={() => setOpen(false)}>Sign in</Link>}
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />}
    <div className="content-frame" inert={mobile && open}>
      <div className="mobile-masthead"><button ref={menuButton} className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation" aria-controls="main-navigation" aria-expanded={open}>☰</button><div><strong>SPSB PDR Portal</strong><small>{teamsEnabled?'2026 year-end review':'Demo appraisal workspace'}</small></div><span className="masthead-badge">{teamsEnabled?'PDR':'DEMO'}</span></div>
      <header className="topbar"><div className="page-title"><p className="eyebrow">Performance &amp; development review</p><h1>{title}</h1><p>{subtitle}</p></div><div className="user-chip"><span>{userInitials||'HR'}</span><div><strong>{userName}</strong><small>{teamsEnabled?roleLabel:'Demo mode'}</small></div></div></header>
      <main id="main-content" tabIndex={-1} className="page-content">
        {teamsEnabled ? checking ? <div className="state-card">Checking company access…</div> : accessError ? <div className="state-card"><h2>Company access required</h2><p>{accessError}</p><Link className="button" href="/login">Return to sign in</Link></div> : !routeAllowed ? <div className="state-card"><h2>Page not available</h2><p>Your company role does not permit access to this page.</p><Link className="button" href={access?.role==='employee'?'/pdr':'/'}>Open your workspace</Link></div> : <><p className="scope-banner">{scope}{access?.role==='viewer'?' · Read-only access; contact HR for updates.':''}</p>{children}</> : children}
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation" inert={mobile&&open}>{visibleNav.map(([href,label,icon])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}><span aria-hidden><NavIcon name={icon}/></span>{href==='/'?'Overview':href==='/team'?'Access':href==='/cycles'?'Cycle':href==='/staff'&&['manager','hod'].includes(access?.role||'')?'Reviews':navigationLabel(href,label)}</Link>)}</nav>
  </div>;
}
