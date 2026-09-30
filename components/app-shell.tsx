"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { teamsEnabled, getCompanyAccess, type CompanyAccess } from '@/lib/data/team';

const nav = [
  ["/", "Dashboard", "▦"], ["/staff", "Staff", "♙"], ["/cycles", "Cycles", "◷"], ["/reports", "Reports", "↗"], ["/team", "Team access", "♙"],
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [access,setAccess] = useState<CompanyAccess|null>(null);
  const [accessError,setAccessError] = useState('');
  const [checking,setChecking] = useState(teamsEnabled);
  useEffect(()=>{
    if(!teamsEnabled) return;
    let active=true;
    setChecking(true);
    getCompanyAccess().then(value=>{if(active){setAccess(value);setAccessError('');}}).catch(error=>{if(active){setAccess(null);setAccessError(error.message);}}).finally(()=>{if(active)setChecking(false);});
    return ()=>{active=false;};
  },[pathname]);
  const scope = access?.role === 'manager' ? `Departments: ${access.departments.join(', ')}` : 'Company-wide';
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
      <div className="brand"><span className="brand-mark">P</span><span><strong>PMS Report</strong><small>People operations</small></span></div>
      <nav aria-label="Main navigation">{nav.map(([href, label, icon]) => <Link href={href} key={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""}><span aria-hidden>{icon}</span>{label}</Link>)}</nav>
      <Link href="/login" className="button" onClick={() => setOpen(false)}>Account / Sign in</Link><div className="sidebar-note"><span className="live-dot" />{teamsEnabled?'Company workspace':'Demo workspace'}<small>{teamsEnabled ? (access?scope:'Sign in to view your access') : 'Connected to demo appraisal data'}</small></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />}
    <div className="content-frame" inert={mobile && open}>
      <div className="mobile-masthead"><button ref={menuButton} className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation" aria-controls="main-navigation" aria-expanded={open}>☰</button><div><strong>PMS Executive Suite</strong><small>{teamsEnabled?'Company appraisal operations':'Demo appraisal workspace'}</small></div><span className="masthead-badge">{teamsEnabled?'PMS':'DEMO'}</span></div>
      <header className="topbar"><div className="page-title"><p className="eyebrow">Executive oversight</p><h1>{title}</h1><p>{subtitle}</p></div><div className="user-chip"><span>{teamsEnabled?'PMS':'HR'}</span><div><strong>{teamsEnabled?'Company workspace':'HR workspace'}</strong><small>{teamsEnabled?(access?.role||'Sign in'):'Demo mode'}</small></div></div></header>
      <main id="main-content" tabIndex={-1} className="page-content">
        {teamsEnabled && pathname!=='/team' ? checking ? <div className="state-card">Checking company access…</div> : accessError ? <div className="state-card"><h2>Company access required</h2><p>{accessError}</p><Link className="button" href="/team">Go to Team access</Link></div> : <><p className="scope-banner">{scope}{access && ['manager','viewer'].includes(access.role)?' · Read-only access; contact HR for updates.':''}</p>{children}</> : children}
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation" inert={mobile&&open}>{nav.map(([href,label,icon])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}><span aria-hidden>{icon}</span>{label==='Dashboard'?'Overview':label==='Team access'?'Team':label}</Link>)}</nav>
  </div>;
}
