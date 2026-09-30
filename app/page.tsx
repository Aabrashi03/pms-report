"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { StatusBadge } from '@/components/status-badge';
import { SubmissionForm } from '@/components/submission-form';
import { getActiveCycleDashboard, type DashboardRow } from '@/lib/data/client';
import { summarise, displayPercent, isSubmitted } from '@/lib/report';

export default function DashboardPage() {
  const [rows,setRows] = useState<DashboardRow[]>([]);
  const [cycle,setCycle] = useState<{id:string;name:string;due_date:string}|null>(null);
  const [selected,setSelected] = useState<DashboardRow|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [filter,setFilter] = useState('all');
  const load = useCallback(async()=>{
    setLoading(true);setError('');
    try { const result = await getActiveCycleDashboard();setRows(result.rows);setCycle(result.cycle); }
    catch(cause) { setError(cause instanceof Error ? cause.message : 'Could not load submissions.'); }
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const s = useMemo(()=>summarise(rows),[rows]);
  const visibleRows = useMemo(()=>rows.filter(r=>filter==='all'||(filter==='outstanding'?!isSubmitted(r):isSubmitted(r))).sort((a,b)=>a.staff.full_name.localeCompare(b.staff.full_name)),[rows,filter]);
  const bottlenecks=new Intl.ListFormat('en',{style:'long',type:'conjunction'}).format(s.departments.filter(d=>d.outstanding>0).map(d=>d.name));
  return <AppShell title="Performance dashboard" subtitle={cycle?`${cycle.name} · Due ${formatDate(cycle.due_date)}`:'Current appraisal cycle'}>
    {loading?<div className="state-card" role="status">Loading appraisal overview…</div>:error?<div className="state-card error-state"><h2>Report unavailable</h2><p>{error}</p><button className="button" onClick={load}>Try again</button></div>:!cycle?<div className="state-card"><h2>No active cycle</h2><p>Create or activate a cycle to begin.</p><Link href="/cycles" className="button">Manage cycles</Link></div>:!rows.length?<div className="state-card"><h2>No appraisal records</h2><p>Add staff to this cycle to begin.</p><Link href="/staff" className="button">Manage staff</Link></div>:<>
      <section className="executive-roster" aria-label="Executive summary">
        <div className="executive-roster-top"><span className="gold-eyebrow">Executive summary<br className="mobile-only"/> roster</span><span className="cycle-chip">Cycle completion: <strong>{displayPercent(s.completionRate)}</strong></span></div>
        <div className="executive-roster-main"><div><div className="hero-fraction"><strong>{s.completed}</strong><span>/ {s.total}</span><small>Appraisals received</small></div><p>{s.overdue ? `${s.overdue} submissions overdue` : s.outstanding ? `${s.outstanding} awaiting submission` : 'All recorded appraisals received'}</p></div><div className="completion-ring" style={{background:`conic-gradient(#c89c3b ${s.completionRate||0}%,#1b382c 0)`}}><span>{displayPercent(s.completionRate)}<small>complete</small></span></div></div>
        <div className="workflow-caption"><span>Submission distribution</span><span>{s.outstanding} outstanding</span></div><div className="workflow-track" aria-label={`${s.completed} submitted, ${s.pending} pending, ${s.overdue} overdue`}><i style={{width:`${s.completed/s.total*100}%`}}/><i style={{width:`${s.pending/s.total*100}%`}}/><i style={{width:`${s.overdue/s.total*100}%`}}/></div><div className="workflow-legend"><span>Submitted ({s.completed})</span><span>Pending ({s.pending})</span><span>Overdue ({s.overdue})</span></div>
      </section>
      <section className="executive-secondary" aria-label="Timeliness indicators"><div className="executive-stat"><p className="eyebrow">On-time share of received</p><strong>{displayPercent(s.onTimeRate)}</strong><div><span>Received by deadline</span><b>{s.onTime}/{s.completed} received</b></div></div><div className={`executive-stat ${s.overdue?'attention-stat':''}`}><p className="eyebrow">Attention required</p><strong>{s.overdue} <small>overdue</small></strong><div><span>Submitted records needing checks</span><b>{s.incomplete} records</b></div></div></section>
      <section className="executive-briefing"><div><p className="eyebrow">Executive briefing</p><Link href="/reports" aria-label="Open full appraisal report">Full report →</Link></div><p>{s.outstanding?`${s.completed} of ${s.total} appraisals have been received. Follow up with ${bottlenecks} on the ${s.outstanding} outstanding submissions.`:'All recorded appraisals have been received. Review rating consistency and complete data checks before closing the cycle.'}</p></section>
      <section className="table-card institutional-roster"><div className="section-heading"><div><p className="eyebrow">Staff roster</p><h2>Staff appraisal status</h2></div><Link href="/reports" className="row-action report-action" aria-label="Review the full appraisal report">Review report ↗</Link></div><div className="roster-filters" role="group" aria-label="Filter submissions">{[['all',`All (${s.total})`],['outstanding',`Action needed (${s.outstanding})`],['submitted',`Submitted (${s.completed})`]].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
        <div className="desktop-roster table-wrap"><table><thead><tr>{['Staff member','Department','Status','Submitted','Rating','Action'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{visibleRows.map(r=><tr key={r.id}><td><button className="person-button" onClick={()=>setSelected(r)} aria-label={`Open ${r.staff.full_name}'s appraisal`}><span className="avatar">{initials(r.staff.full_name)}</span><span><strong>{r.staff.full_name}</strong><small>{r.staff.position||r.staff.employee_id}</small></span></button></td><td>{r.staff.department||'Unassigned'}</td><td><StatusBadge status={r.derived_status}/></td><td>{r.submission_date?formatDate(r.submission_date):'—'}</td><td>{r.rating||'—'}</td><td><button className="row-action" onClick={()=>setSelected(r)} aria-label={`View or update ${r.staff.full_name}'s appraisal`}>View / update</button></td></tr>)}</tbody></table></div>
        <div className="mobile-roster">{visibleRows.map(r=><button className="mobile-staff-row" key={r.id} onClick={()=>setSelected(r)} aria-label={`View appraisal for ${r.staff.full_name}`}><span className={`staff-initials ${r.derived_status==='overdue'?'staff-alert':''}`}>{initials(r.staff.full_name)}</span><span className="staff-row-copy"><span className="staff-row-title"><strong>{r.staff.full_name}</strong><StatusBadge status={r.derived_status}/></span><span className="staff-row-meta">{r.staff.position||r.staff.employee_id} · {r.staff.department||'Unassigned'}</span><span className="staff-row-date">{r.submission_date?formatDate(r.submission_date):'Awaiting submission'}</span></span></button>)}</div>
        {!visibleRows.length&&<p className="report-note">No appraisals match this filter.</p>}
        <div className="roster-footer"><span><strong>Department follow-up</strong><small>{s.outstanding} appraisals awaiting submission</small></span><Link href="/reports" className="button" aria-label="Review outstanding appraisals by department">Review →</Link></div>
      </section><div className="cycle-deadline"><span>Cycle deadline: <strong>{formatDate(cycle.due_date)}</strong></span><Link href="/cycles" aria-label="Open appraisal cycle details">Cycle details ↗</Link></div>
    </>}
    {selected&&cycle&&<SubmissionForm row={selected} cycle={cycle} onClose={()=>setSelected(null)} onSaved={async()=>{setSelected(null);await load();}}/>}
  </AppShell>;
}
function formatDate(value:string) {return new Intl.DateTimeFormat('en-MY',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));}
function initials(value:string) {return value.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();}
