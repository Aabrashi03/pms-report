"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  ["/", "Dashboard", "▦"], ["/staff", "Staff", "♙"], ["/cycles", "Cycles", "◷"], ["/reports", "Reports", "↗"],
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="app-frame">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark">P</span><span><strong>PMS Report</strong><small>People operations</small></span></div>
      <nav aria-label="Main navigation">{nav.map(([href, label, icon]) => <Link href={href} key={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : ""}><span aria-hidden>{icon}</span>{label}</Link>)}</nav>
      <div className="sidebar-note"><span className="live-dot" /> Demo workspace<small>Connected to live appraisal data</small></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="content-frame">
      <header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button><div><p className="eyebrow">Appraisal operations</p><h1>{title}</h1><p>{subtitle}</p></div><div className="user-chip"><span>HR</span><div><strong>HR workspace</strong><small>Demo mode</small></div></div></header>
      <main className="page-content">{children}</main>
    </div>
  </div>;
}
