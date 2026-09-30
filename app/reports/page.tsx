"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getActiveCycleDashboard, writeAudit, type DashboardRow } from "@/lib/data/client";

export default function ReportsPage() {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [cycle, setCycle] = useState<{ id:string; name:string; due_date:string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState<{ title:string; body:string } | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const result=await getActiveCycleDashboard(); setRows(result.rows); setCycle(result.cycle); setError(""); } catch(cause) { setError(cause instanceof Error?cause.message:"Could not load report."); } finally { setLoading(false); } }, []);
  useEffect(() => void load(), [load]);
  const completed=rows.filter(row=>["submitted","late"].includes(row.derived_status)).length;
  const onTime=rows.filter(row=>row.derived_status==="submitted").length;
  const overdueRows=rows.filter(row=>row.derived_status==="overdue");
  const completionRate=rows.length?Math.round(completed/rows.length*100):0;
  const onTimeRate=completed?Math.round(onTime/completed*100):0;
  const departments=useMemo(()=>{const map=new Map<string,{total:number;complete:number}>();rows.forEach(row=>{const key=row.staff.department||"Unassigned";const current=map.get(key)||{total:0,complete:0};current.total++;if(["submitted","late"].includes(row.derived_status))current.complete++;map.set(key,current)});return [...map].map(([name,value])=>({name,...value,rate:Math.round(value.complete/value.total*100)})).sort((a,b)=>a.rate-b.rate)},[rows]);
  async function exportReport(){if(!cycle)return;setExporting(true);try{const XLSX=await import("xlsx");const records=rows.map(row=>({"Employee ID":row.staff.employee_id,"Staff Name":row.staff.full_name,"Department":row.staff.department||"","Position":row.staff.position||"","Status":row.derived_status.replace("_"," "),"Submission Date":row.submission_date||"","Rating":row.rating||"","Reviewer":row.reviewer_name||"","Comments":row.comments||""}));const workbook=XLSX.utils.book_new();const sheet=XLSX.utils.json_to_sheet(records);sheet["!cols"]=[{wch:14},{wch:22},{wch:20},{wch:24},{wch:15},{wch:18},{wch:24},{wch:22},{wch:42}];XLSX.utils.book_append_sheet(workbook,sheet,"Appraisal report");XLSX.writeFile(workbook,`${cycle.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-report.xlsx`);await writeAudit("report_exported","appraisal_cycle",cycle.id,{rows:rows.length})}catch{setError("Could not export the report. Please retry.")}finally{setExporting(false)}}
  function executiveDraft(){if(!cycle)return;const weakest=departments[0];setDraft({title:"Draft executive summary",body:`${cycle.name} is ${completionRate}% complete, with ${completed} of ${rows.length} appraisals submitted. ${onTimeRate}% of completed appraisals were received on time. ${overdueRows.length} ${overdueRows.length===1?"submission remains":"submissions remain"} overdue${weakest?`; ${weakest.name} currently has the lowest department completion rate at ${weakest.rate}%`:""}. HR should prioritise follow-up with outstanding staff before the cycle is closed.`})}
  function reminderDraft(){setDraft({title:"Draft overdue reminder",body:`Subject: Action required — ${cycle?.name}\n\nHello,\n\nOur records show that your appraisal submission is still outstanding. Please complete and submit it as soon as possible so HR can finalise the ${cycle?.name} report. If you have already submitted, please contact HR so we can update our records.\n\nThank you,\nHR Team`})}
  return <AppShell title="Management report" subtitle={cycle?`${cycle.name} · live completion summary`:"Active cycle report"}>
    {error&&<p className="form-error page-error">{error}</p>}
    {loading?<div className="state-card">Loading report…</div>:!cycle?<div className="state-card"><h2>No active cycle</h2><p>Activate a cycle to generate its report.</p></div>:<>
      <div className="report-hero"><div><p className="eyebrow">Executive snapshot</p><h2>{completed} of {rows.length} appraisals complete</h2><p>{completionRate}% completion · {onTimeRate}% on time · {overdueRows.length} overdue</p></div><button className="button export-button" onClick={exportReport} disabled={exporting}>{exporting?"Preparing…":"↓ Export to Excel"}</button></div>
      <div className="draft-actions"><button className="button button-secondary" onClick={executiveDraft}>Draft executive summary</button><button className="button button-secondary" onClick={reminderDraft} disabled={!overdueRows.length}>Draft overdue reminder</button></div>
      {draft&&<section className="draft-card"><div><p className="eyebrow">Review before use</p><h3>{draft.title}</h3></div><button className="icon-button" onClick={()=>setDraft(null)}>×</button><textarea aria-label={draft.title} value={draft.body} onChange={event=>setDraft({...draft,body:event.target.value})}/></section>}
      <section className="report-grid"><div className="table-card"><div className="section-heading"><div><p className="eyebrow">Priority view</p><h2>By department</h2></div></div><div className="department-list">{departments.map(dept=><div key={dept.name}><span><strong>{dept.name}</strong><small>{dept.complete}/{dept.total} complete</small></span><div className="mini-progress"><i style={{width:`${dept.rate}%`}}/></div><b>{dept.rate}%</b></div>)}</div></div><div className="table-card"><div className="section-heading"><div><p className="eyebrow">Follow-up list</p><h2>Outstanding staff</h2></div></div><div className="follow-list">{rows.filter(row=>!["submitted","late"].includes(row.derived_status)).map(row=><div key={row.id}><span><strong>{row.staff.full_name}</strong><small>{row.staff.department}</small></span><StatusBadge status={row.derived_status}/></div>)}{overdueRows.length===0&&<p className="empty-inline">Everyone has submitted.</p>}</div></div></section>
    </>}
  </AppShell>;
}
