"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { WorkflowTracker, workflowLabel } from "@/components/workflow-tracker";
import { hasSeparateHod } from "@/lib/workflow-route";
import { getActiveCycleDashboard, type DashboardRow } from "@/lib/data/client";
import { getCompanyAccess, type CompanyAccess } from "@/lib/data/team";
import { summarise, displayPercent, isSubmitted } from "@/lib/report";

type Cycle = { id: string; name: string; due_date: string };

export default function DashboardPage() {
  const [rows,setRows]=useState<DashboardRow[]>([]);
  const [cycle,setCycle]=useState<Cycle|null>(null);
  const [access,setAccess]=useState<CompanyAccess|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState("all");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try { const [result,companyAccess]=await Promise.all([getActiveCycleDashboard(),getCompanyAccess()]);setRows(result.rows);setCycle(result.cycle);setAccess(companyAccess); }
    catch(cause) { setError(cause instanceof Error?cause.message:"Could not load submissions."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load();},[load]);
  const s=useMemo(()=>summarise(rows),[rows]);
  const visibleRows=useMemo(()=>rows.filter(r=>filter==="all"||(filter==="outstanding"?!isSubmitted(r):isSubmitted(r))).sort((a,b)=>a.staff.full_name.localeCompare(b.staff.full_name)),[rows,filter]);
  const stages=useMemo(()=>({draft:rows.filter(r=>!r.workflow_stage||["employee_draft","returned"].includes(r.workflow_stage)).length,manager:rows.filter(r=>r.workflow_stage==="manager_review").length,hod:rows.filter(r=>r.workflow_stage==="hod_endorsement").length,completed:rows.filter(r=>["hr_review","completed"].includes(r.workflow_stage||"")).length}),[rows]);
  const subtitle=cycle?`${cycle.name} · Due ${formatDate(cycle.due_date)}`:"Current appraisal cycle";
  const title=access?.role==="employee"?"My performance review":access?.role==="manager"?"Manager review queue":access?.role==="hod"?"HOD endorsement queue":"Performance dashboard";
  return <AppShell title={title} subtitle={subtitle}>
    {loading?<div className="state-card" role="status">Loading appraisal overview…</div>:error?<div className="state-card error-state"><h2>Dashboard unavailable</h2><p>{error}</p><button className="button" onClick={load}>Try again</button></div>:!cycle?<div className="state-card"><h2>No active cycle</h2><p>HR must create or activate an appraisal cycle.</p>{access&&["owner","editor"].includes(access.role)&&<Link href="/cycles" className="button">Manage cycles</Link>}</div>:!rows.length?<div className="state-card"><h2>No PDR assigned</h2><p>No appraisal record is currently assigned to your account.</p></div>:access?.role==="employee"?<EmployeeDashboard row={rows[0]} cycle={cycle}/>:access?.role==="manager"||access?.role==="hod"?<ReviewerDashboard rows={rows} cycle={cycle} role={access.role}/>:<CompanyDashboard rows={visibleRows} cycle={cycle} access={access} summary={s} stages={stages} filter={filter} setFilter={setFilter}/>}
  </AppShell>;
}

function EmployeeDashboard({row,cycle}:{row:DashboardRow;cycle:Cycle}) {
  const stage=row.workflow_stage||"employee_draft";
  const separateHod=hasSeparateHod(row.staff);
  return <div className="employee-dashboard">
    <section className="employee-focus-card"><div><p className="eyebrow">My 2026 PDR</p><h2>{row.staff.full_name}</h2><p>{row.staff.position||"Position not set"} · {row.staff.department||"Department not set"}</p></div><StatusBadge status={row.derived_status}/><div className="employee-next-action"><span>Next action</span><strong>{employeeNextAction(stage)}</strong><small>Deadline: {formatDate(cycle.due_date)}</small><Link className="button" href={`/pdr?submission=${row.id}`}>{["hr_review","completed"].includes(stage)?"View completed PDR":"Open my PDR"}</Link></div></section>
    <WorkflowTracker row={row}/>
    <section className="employee-help-card"><div><p className="eyebrow">What happens next</p><h3>{["hr_review","completed"].includes(stage)?"Your review is complete":"Your form follows the SPSB approval route"}</h3></div><p>{["hr_review","completed"].includes(stage)?"Your PDR has reached HR and is completed. You may open or print it for your records.":separateHod?"After your submission, your N+1 Manager/HOD reviews the form, followed by the assigned N+2 approver. Once it reaches HR, the PDR is completed.":"After your submission, your assigned N+1 superior reviews the form. Once it reaches HR, the PDR is completed."}</p></section>
  </div>;
}

function ReviewerDashboard({rows,cycle,role}:{rows:DashboardRow[];cycle:Cycle;role:"manager"|"hod"}) {
  const target=role==="manager"?"manager_review":"hod_endorsement";
  const queue=rows.filter(row=>row.workflow_stage===target);
  const forwarded=rows.filter(row=>role==="manager"?["hod_endorsement","hr_review","completed"].includes(row.workflow_stage||""):["hr_review","completed"].includes(row.workflow_stage||"")).length;
  return <>
    <section className="reviewer-summary"><article><span>Assigned employees</span><strong>{rows.length}</strong><small>Visible to your role</small></article><article className="reviewer-action-count"><span>Awaiting your action</span><strong>{queue.length}</strong><small>{role==="manager"?"Manager reviews":"HOD endorsements"}</small></article><article><span>Forwarded</span><strong>{forwarded}</strong><small>Moved to the next stage</small></article></section>
    <section className="executive-briefing"><div><p className="eyebrow">Your review priority</p></div><p>{queue.length?`${queue.length} PDR${queue.length===1?" is":"s are"} ready for your ${role==="manager"?"review":"endorsement"}. Open each employee’s full form, add your assessment and send it to the next stage.`:"There are no PDRs awaiting your action. You can still view the progress of all assigned employees below."}</p></section>
    <Roster rows={rows} heading={role==="manager"?"My employees":"Division employees"} actionLabel={role==="manager"?"Review PDR":"Endorse PDR"}/>
    <div className="cycle-deadline"><span>Cycle deadline: <strong>{formatDate(cycle.due_date)}</strong></span></div>
  </>;
}

function CompanyDashboard({rows,cycle,access,summary:s,stages,filter,setFilter}:{rows:DashboardRow[];cycle:Cycle;access:CompanyAccess|null;summary:ReturnType<typeof summarise>;stages:{draft:number;manager:number;hod:number;completed:number};filter:string;setFilter:(value:string)=>void}) {
  const canReport=!!access&&["owner","editor","viewer"].includes(access.role),canManageCycle=!!access&&["owner","editor"].includes(access.role);
  return <>
    <section className="workflow-metric-grid" aria-label="PDR workflow summary">{[["Total employees",s.total,"metric-total"],["Employee action",stages.draft,"metric-draft"],["Manager review",stages.manager,"metric-manager"],["HOD endorsement",stages.hod,"metric-hod"],["Completed / with HR",stages.completed,"metric-complete"]].map(([label,value,className])=><article className={`workflow-metric ${className}`} key={label}><span>{label}</span><strong>{value}</strong><small>{label==="Total employees"?"Assigned to this cycle":label==="Completed / with HR"?"PDR process complete":"Current workflow stage"}</small></article>)}</section>
    <section className="executive-roster" aria-label="Executive summary"><div className="executive-roster-top"><span className="gold-eyebrow">Executive summary roster</span><span className="cycle-chip">Cycle completion: <strong>{displayPercent(s.completionRate)}</strong></span></div><div className="executive-roster-main"><div><div className="hero-fraction"><strong>{s.completed}</strong><span>/ {s.total}</span><small>Appraisals received</small></div><p>{s.overdue?`${s.overdue} submissions overdue`:s.outstanding?`${s.outstanding} awaiting submission`:"All recorded appraisals received"}</p></div><div className="completion-ring" style={{background:`conic-gradient(#c89c3b ${s.completionRate||0}%,#1b382c 0)`}}><span>{displayPercent(s.completionRate)}<small>complete</small></span></div></div><div className="workflow-caption"><span>Submission distribution</span><span>{s.outstanding} outstanding</span></div><div className="workflow-track"><i style={{width:`${s.completed/s.total*100}%`}}/><i style={{width:`${s.pending/s.total*100}%`}}/><i style={{width:`${s.overdue/s.total*100}%`}}/></div><div className="workflow-legend"><span>Submitted ({s.completed})</span><span>Pending ({s.pending})</span><span>Overdue ({s.overdue})</span></div></section>
    <section className="executive-secondary"><div className="executive-stat"><p className="eyebrow">On-time share of received</p><strong>{displayPercent(s.onTimeRate)}</strong><div><span>Received by deadline</span><b>{s.onTime}/{s.completed} received</b></div></div><div className={`executive-stat ${s.overdue?"attention-stat":""}`}><p className="eyebrow">Attention required</p><strong>{s.overdue} <small>overdue</small></strong><div><span>Submitted records needing checks</span><b>{s.incomplete} records</b></div></div></section>
    <section className="executive-briefing"><div><p className="eyebrow">Next management action</p>{canReport&&<Link href="/reports">Full report →</Link>}</div><p>{stages.draft?`${stages.draft} employees still need to complete or resubmit their PDR. ${stages.manager} await manager review, ${stages.hod} await N+2 endorsement and ${stages.completed} are completed and with HR.`:stages.completed===s.total?"All PDRs have reached HR and completed the workflow. Review final ratings and prepare the management summary.":`${stages.manager} await manager review, ${stages.hod} await N+2 endorsement and ${stages.completed} are completed and with HR.`}</p></section>
    <section className="table-card institutional-roster"><div className="section-heading"><div><p className="eyebrow">Staff roster</p><h2>Staff appraisal status</h2></div>{canReport&&<Link href="/reports" className="row-action report-action">Review report ↗</Link>}</div><div className="roster-filters" role="group" aria-label="Filter submissions">{[["all",`All (${s.total})`],["outstanding",`Action needed (${s.outstanding})`],["submitted",`Submitted (${s.completed})`]].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><RosterTable rows={rows}/><div className="roster-footer"><span><strong>Department follow-up</strong><small>{s.outstanding} appraisals awaiting submission</small></span>{canReport&&<Link href="/reports" className="button">Review →</Link>}</div></section>
    <div className="cycle-deadline"><span>Cycle deadline: <strong>{formatDate(cycle.due_date)}</strong></span>{canManageCycle&&<Link href="/cycles">Cycle details ↗</Link>}</div>
  </>;
}

function Roster({rows,heading,actionLabel}:{rows:DashboardRow[];heading:string;actionLabel:string}) { return <section className="table-card institutional-roster"><div className="section-heading"><div><p className="eyebrow">Assigned review list</p><h2>{heading}</h2></div><span className="queue-total">{rows.length} records</span></div><RosterTable rows={rows} actionLabel={actionLabel}/></section>; }

function RosterTable({rows,actionLabel="View PDR"}:{rows:DashboardRow[];actionLabel?:string}) { return <><div className="desktop-roster table-wrap"><table><thead><tr>{["Staff member","Department","Workflow stage","Submitted","Rating","Action"].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><Link className="person-button" href={`/pdr?submission=${r.id}`}><span className="avatar">{initials(r.staff.full_name)}</span><span><strong>{r.staff.full_name}</strong><small>{r.staff.position||r.staff.employee_id}</small></span></Link></td><td>{r.staff.department||"Unassigned"}</td><td><span className="workflow-stage-label">{workflowLabel(r.workflow_stage,r.staff)}</span></td><td>{r.submission_date?formatDate(r.submission_date):"—"}</td><td>{r.rating||"—"}</td><td><Link className="row-action" href={`/pdr?submission=${r.id}`}>{actionLabel}</Link></td></tr>)}</tbody></table></div><div className="mobile-roster">{rows.map(r=><Link className="mobile-staff-row" key={r.id} href={`/pdr?submission=${r.id}`}><span className={`staff-initials ${r.derived_status==="overdue"?"staff-alert":""}`}>{initials(r.staff.full_name)}</span><span className="staff-row-copy"><span className="staff-row-title"><strong>{r.staff.full_name}</strong><span className="workflow-stage-label">{workflowLabel(r.workflow_stage,r.staff)}</span></span><span className="staff-row-meta">{r.staff.position||r.staff.employee_id} · {r.staff.department||"Unassigned"}</span></span></Link>)}</div>{!rows.length&&<p className="report-note">No PDR records match this view.</p>}</>; }

function employeeNextAction(stage:string) { if (stage==="returned") return "Amend and resubmit your PDR"; if (stage==="employee_draft"||!stage) return "Complete and submit your self-assessment"; if (stage==="manager_review") return "Your assigned superior is reviewing your PDR"; if (stage==="hod_endorsement") return "Awaiting N+2 endorsement"; if (stage==="hr_review") return "Completed and received by HR"; return "No further action required"; }
function formatDate(value:string) { return new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value.slice(0,10)}T00:00:00Z`)); }
function initials(value:string) { return value.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(); }
