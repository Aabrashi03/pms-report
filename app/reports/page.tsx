"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { StatusBadge } from '@/components/status-badge';
import { getActiveCycleDashboard, writeAudit, type DashboardRow } from '@/lib/data/client';
import { summarise, executiveSummary, displayPercent, isSubmitted } from '@/lib/report';
import './report.css';

export default function ReportsPage() {
  const [rows,setRows] = useState<DashboardRow[]>([]);
  const [cycle,setCycle] = useState<{id:string;name:string;due_date:string}|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [exporting,setExporting] = useState(false);
  const [asOf,setAsOf] = useState('');
  const [draft,setDraft] = useState<{title:string;body:string}|null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await getActiveCycleDashboard(); setRows(result.rows); setCycle(result.cycle); setAsOf(new Date().toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}) + ' MYT'); }
    catch(cause) { setRows([]); setCycle(null); setError(cause instanceof Error ? cause.message : 'Could not load report.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(() => { void load(); },[load]);
  const s = useMemo(() => summarise(rows),[rows]);
  const summary = cycle ? executiveSummary(cycle.name,s) : '';
  const outstanding = rows.filter(r => !isSubmitted(r)).sort((a,b) => Number(b.derived_status==='overdue')-Number(a.derived_status==='overdue') || a.staff.full_name.localeCompare(b.staff.full_name));
  const actions = [
    ...(s.overdue ? [{priority:'Urgent',action:`Resolve ${s.overdue} overdue submissions; agree a recovery date.`,owner:'HR / department heads'}] : []),
    ...(s.pending ? [{priority:'Before deadline',action:`Confirm submission plans for ${s.pending} pending appraisals.`,owner:'HR / reviewers'}] : []),
    ...(s.incomplete ? [{priority:'Before sign-off',action:`Validate ${s.incomplete} submitted records with missing or unrecognised ratings or missing reviewers.`,owner:'HR / reviewers'}] : []),
    ...(s.total && !s.outstanding && !s.incomplete ? [{priority:'Review',action:'Review rating consistency and confirm readiness for cycle closure.',owner:'HR / management'}] : [])
  ];
  async function exportReport() {
    if (!cycle) return;
    setExporting(true); setError('');
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.utils.book_new();
      const add = (name:string, data:(string|number|null)[][], widths:number[]) => {
        const sheet = XLSX.utils.aoa_to_sheet(data);
        sheet['!cols'] = widths.map(wch=>({wch}));
        if(data.length>1) sheet['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:data.length-1,c:data[0].length-1}})};
        XLSX.utils.book_append_sheet(book,sheet,name);
      };
      add('Executive summary',[
        ['Management review',cycle.name],['Data refreshed',asOf],['Due date',cycle.due_date],['Scope','Appraisal records linked to the active cycle; not independently reconciled to the staff directory.'],
        ['Appraisal records',s.total],['Submitted (includes late)',s.completed],['Completion',displayPercent(s.completionRate)],['Received on time',s.onTime],['Received late',s.late],['On-time share of submissions',displayPercent(s.onTimeRate)],['Overdue and outstanding',s.overdue],['Pending before deadline',s.pending],['Submitted records needing checks',s.incomplete],['Executive summary',summary],['Interpretation','N/A means no denominator. Ratings include recognised ratings on submitted records only. No historical comparison is available.'],['Handling','Internal management review; contains staff appraisal information.']
      ],[38,110]);
      add('Departments',[['Department','Records','Submitted','Outstanding','Overdue','Completion'],...s.departments.map(d=>[d.name,d.total,d.complete,d.outstanding,d.overdue,displayPercent(d.rate)])],[26,14,14,14,14,16]);
      add('Ratings',[['Rating','Count','Share of rated submissions'],...s.ratings.map(r=>[r.name,r.count,displayPercent(r.share)]),['Missing rating on submitted records',s.missingRating,'Excluded'],['Unrecognised rating on submitted records',s.unrecognisedRating,'Excluded']],[46,14,30]);
      add('Management actions',[['Priority','Recommended action','Suggested owner'],...actions.map(a=>[a.priority,a.action,a.owner])],[24,100,30]);
      const headers=['Employee ID','Staff name','Department','Position','Status','Submission date','Rating','Reviewer','Comments'];
      const detail=(r:DashboardRow) => [r.staff.employee_id,r.staff.full_name,r.staff.department||'Unassigned',r.staff.position||'',r.derived_status.replaceAll('_',' '),r.submission_date||'',r.rating||'',r.reviewer_name||'',r.comments||''];
      add('Outstanding',[headers,...outstanding.map(detail)],[18,26,24,26,22,20,26,24,60]);
      add('Staff detail',[headers,...rows.map(detail)],[18,26,24,26,22,20,26,24,60]);
      XLSX.writeFile(book,`${cycle.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-management-report.xlsx`);
      void writeAudit('report_exported','appraisal_cycle',cycle.id,{rows:rows.length,format:'management-workbook'}).catch(()=>{});
    } catch { setError('Could not export the report. Please retry.'); }
    finally { setExporting(false); }
  }
  return <AppShell title="Management report" subtitle="Appraisal completion, performance profile and management actions">
    <div className="management-report">
    {error && <p role="alert" className="form-error page-error">{error} <button className="row-action" onClick={load}>Retry</button></p>}
    {loading ? <div className="state-card">Loading management report…</div> : !cycle ? <div className="state-card"><h2>{error?'Report unavailable':'No active cycle'}</h2><p>{error?'Refresh to try again.':'Activate an appraisal cycle to prepare a management report.'}</p></div> : <>
      <div className="report-toolbar"><span>Internal · Management review</span><div><button className="button button-secondary" onClick={load}>Refresh data</button><button className="button button-secondary" onClick={()=>window.print()}>Print / Save PDF</button><button className="button" onClick={exportReport} disabled={exporting||!rows.length}>{exporting?'Preparing workbook…':'Export management Excel'}</button></div></div>
      <section className="report-hero"><div><p className="eyebrow">Appraisal review</p><h2>{cycle.name}</h2><p>Due {cycle.due_date} · Data refreshed {asOf}</p></div><strong className="review-label">{!s.total?'No records':s.overdue?'Follow-up required':s.outstanding?'In progress':s.incomplete?'Data checks required':'Ready for management review'}</strong></section>
      {!s.total ? <div className="state-card"><h2>No appraisal records</h2><p>Confirm the staff population for this cycle before preparing a management review.</p></div> : <>
      <section className="management-metrics" aria-label="Key indicators">
        {[['Completion',displayPercent(s.completionRate),`${s.completed} of ${s.total} received, including late`],['On-time submissions',displayPercent(s.onTimeRate),`${s.onTime} of ${s.completed} received by the deadline`],['Outstanding',String(s.outstanding),`${s.overdue} overdue · ${s.pending} pending`],['Data checks',String(s.incomplete),'Submitted records requiring rating / reviewer checks']].map(([label,value,note])=><div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}
      </section>
      <section className="management-summary"><p className="eyebrow">01 / Executive assessment</p><h2>Position at a glance</h2><p>{summary}</p></section>
      <section className="table-card management-section"><div className="section-heading"><div><p className="eyebrow">02 / Decisions and follow-up</p><h2>Recommended management actions</h2></div></div><div className="table-wrap"><table><thead><tr><th scope="col">Priority</th><th scope="col">Action</th><th scope="col">Suggested owner</th></tr></thead><tbody>{actions.map(a=><tr key={a.priority}><td><strong>{a.priority}</strong></td><td>{a.action}</td><td>{a.owner}</td></tr>)}</tbody></table></div><p className="report-note">Recommendations only. Assign owners and agree target dates during review.</p></section>
      <section className="table-card management-section"><div className="section-heading"><div><p className="eyebrow">03 / Department accountability</p><h2>Completion by department</h2></div></div><div className="table-wrap"><table><thead><tr>{['Department','Records','Submitted','Outstanding','Overdue','Completion'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{s.departments.map(d=><tr key={d.name}><td><strong>{d.name}</strong></td><td>{d.total}</td><td>{d.complete}</td><td>{d.outstanding}</td><td>{d.overdue}</td><td><strong>{displayPercent(d.rate)}</strong><div className="mini-progress"><i style={{width:`${d.rate||0}%`}}/></div></td></tr>)}</tbody></table></div><p className="report-note">Sorted by overdue count, then lowest completion. Completion measures receipt, not performance quality.</p></section>
      <section className="report-grid management-section"><div className="table-card"><div className="section-heading"><div><p className="eyebrow">04 / Performance profile</p><h2>Rating distribution</h2></div></div><div className="rating-list">{s.ratings.map(r=><div key={r.name}><span>{r.name}</span><div className="mini-progress"><i style={{width:`${r.share||0}%`}}/></div><strong>{r.count} · {displayPercent(r.share)}</strong></div>)}</div><p className="report-note">Base: {s.rated} submitted appraisals with recognised ratings. Missing: {s.missingRating}; unrecognised: {s.unrecognisedRating}. Missing reviewer: {s.missingReviewer}. Ratings are provisional pending management review.</p></div>
      <div className="table-card"><div className="section-heading"><div><p className="eyebrow">05 / Follow-up register</p><h2>Outstanding submissions</h2></div></div><div className="follow-list">{outstanding.map(r=><div key={r.id}><span><strong>{r.staff.full_name}</strong><small>{r.staff.employee_id} · {r.staff.department||'Unassigned'}</small></span><StatusBadge status={r.derived_status}/></div>)}{!outstanding.length&&<p className="empty-inline">All recorded appraisals have been received.</p>}</div></div></section>
      <div className="draft-actions"><button className="button button-secondary" onClick={()=>setDraft({title:'Draft executive summary',body:summary})}>Edit summary draft</button><button className="button button-secondary" disabled={!s.overdue} onClick={()=>setDraft({title:'Draft overdue reminder',body:`Subject: Appraisal follow-up — ${cycle.name}\n\nHello,\n\nOur records show that your appraisal remains outstanding after the ${cycle.due_date} deadline. Please confirm your expected submission date with HR. If already submitted, please share the details so we can update our records.\n\nThank you,\nHR Team`})}>Draft overdue reminder</button></div>
      {draft&&<section className="draft-card"><h3>{draft.title}</h3><button className="icon-button" aria-label="Close draft" onClick={()=>setDraft(null)}>×</button><textarea aria-label={draft.title} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/><small>Draft only; not sent or saved. Excel and print use the calculated assessment above.</small></section>}
      </>}
      <footer className="report-method"><strong>Report basis</strong><p>Active-cycle appraisal records only; the population has not been independently reconciled against the staff directory. Submitted includes late receipts. On-time rate = on-time receipts ÷ all received submissions. Rating shares use recognised ratings on submitted records only. N/A indicates no denominator. Percentages are rounded and may not total 100%. No historical comparison is included. Refresh before your meeting.</p><p>Internal management review · Contains staff appraisal information.</p></footer>
    </>}
    </div>
  </AppShell>;
}
