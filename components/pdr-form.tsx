"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { savePdrForm, type DashboardRow, type StaffRecord, type WorkflowStage } from "@/lib/data/client";
import type { CompanyAccess } from "@/lib/data/team";
import { WorkflowTracker } from "@/components/workflow-tracker";
import { firstApproverLabel, hasSeparateHod, secondApproverLabel, stageAfterSuperior } from "@/lib/workflow-route";

type Score = "" | "0" | "1" | "2" | "3" | "4" | "5";
type RatingRow = { employee: Score; manager: Score; comments: string };
type KpiRow = { kra: string; kpi: string; action: string; rating?: Score };
type TrainingRow = { competency: string; type: string; programme: string; priority: string; targetDate: string; expectedResult: string };
type ReadinessItem = { id: string; label: string; detail: string; complete: boolean };
type PdrData = {
  particulars: { joinDate: string; confirmationDueDate: string; pdrDate: string; lastPdrDate: string; kpiFrom: string; kpiTo: string };
  sectionA: RatingRow[]; sectionB: RatingRow[]; reflection: KpiRow[]; nextKpis: KpiRow[]; training: TrainingRow[];
  signatures: { employeeDate: string; managerDate: string; hodDate: string; divisionDate: string };
  confirmation: { decision: string; remarks: string; evaluatedBy: string; reviewedBy: string; approvedBy: string; evaluatedDate: string; reviewedDate: string; approvedDate: string };
  workflow: { returnReason: string; returnedAt: string; returnedByRole: string };
};

const sectionA = [
  ["Technical ability", "Consistently demonstrates the professional and technical skills and experience expected for the role."],
  ["Technical ability", "Reflects on work practices and makes adjustments towards continuous improvement."],
  ["Technical ability", "Demonstrates a positive attitude to change and flexibility in meeting new and varied work demands."],
  ["Technical ability", "Understands and complies with standards, policies and procedures relevant to the role."],
  ["Outcomes and service focus", "Focuses on achieving results in line with business KPIs and client needs."],
  ["Outcomes and service focus", "Gets the job done on time, cost effectively and consistently."],
  ["Outcomes and service focus", "Takes accountability for assigned responsibilities and completes tasks on time."],
  ["Outcomes and service focus", "Prioritises effectively across competing demands."],
  ["Values people partnerships and teamwork", "Builds positive working relationships and displays empathy, value and respect for others."],
  ["Values people partnerships and teamwork", "Communicates effectively and adapts style to the purpose and audience."],
  ["Values people partnerships and teamwork", "Works constructively in a team and contributes positively to team goals and activities."],
  ["Values people partnerships and teamwork", "Supports colleagues and assists them to manage time and work productively."],
  ["Willingness to learn and share knowledge", "Shows enthusiasm for learning and sharing knowledge, seeks feedback and supports continuous improvement."],
  ["Willingness to learn and share knowledge", "Takes ownership of professional development and achievement of training KPIs."],
  ["Willingness to learn and share knowledge", "Embraces technology and innovation to improve service delivery."],
  ["Management and leadership — managers only", "Displays strong self-management and reflects on management processes."],
  ["Management and leadership — managers only", "Demonstrates business planning skills and manages resources effectively."],
  ["Management and leadership — managers only", "Recognises others' contributions and supports diversity and equal opportunity."],
  ["Management and leadership — managers only", "Helps others organise workloads and balances team work against expected outcomes."],
  ["Management and leadership — managers only", "Delegates, empowers and makes decisions effectively."],
  ["Management and leadership — managers only", "Builds positive relationships within the team and with stakeholders."],
  ["Management and leadership — managers only", "Applies policies and management processes equitably, transparently and consistently."],
  ["Management and leadership — managers only", "Uses performance management to review learning requirements."],
  ["Management and leadership — managers only", "Displays a positive and flexible attitude to change."],
] as const;

const sectionB = [
  ["Good attendance and punctuality", "Maintains good attendance, starts work on time and remains accountable for duties."],
  ["Responsiveness in tasks and responsibilities", "Finds ways to get the job done, responds promptly, follows through and demonstrates reliability."],
  ["Passionate at work", "Shows persistence, a positive attitude and commitment to meeting or exceeding expectations."],
  ["Works well with others", "Maintains high morale and avoids conflict, cliques, insults, rumours and conduct that demoralises colleagues."],
] as const;

const blankRating = (): RatingRow => ({ employee: "", manager: "", comments: "" });
const blankKpi = (withRating = false): KpiRow => ({ kra: "", kpi: "", action: "", ...(withRating ? { rating: "" as Score } : {}) });
const blankTraining = (): TrainingRow => ({ competency: "", type: "", programme: "", priority: "", targetDate: "", expectedResult: "" });
const initialData = (): PdrData => ({
  particulars: { joinDate: "", confirmationDueDate: "", pdrDate: "", lastPdrDate: "", kpiFrom: "", kpiTo: "" },
  sectionA: sectionA.map(blankRating), sectionB: sectionB.map(blankRating), reflection: [blankKpi(true),blankKpi(true),blankKpi(true)], nextKpis: [blankKpi(),blankKpi(),blankKpi(),blankKpi()],
  training: [blankTraining(),blankTraining(),blankTraining()], signatures: { employeeDate: "", managerDate: "", hodDate: "", divisionDate: "" },
  confirmation: { decision: "", remarks: "", evaluatedBy: "", reviewedBy: "", approvedBy: "", evaluatedDate: "", reviewedDate: "", approvedDate: "" },
  workflow: { returnReason: "", returnedAt: "", returnedByRole: "" },
});

function mergeData(source?: Record<string, unknown> | null): PdrData {
  const base = initialData();
  if (!source) return base;
  const value = source as Partial<PdrData>;
  return { ...base, ...value, particulars: { ...base.particulars, ...value.particulars }, signatures: { ...base.signatures, ...value.signatures }, confirmation: { ...base.confirmation, ...value.confirmation }, workflow: { ...base.workflow, ...value.workflow }, sectionA: base.sectionA.map((r,i)=>({...r,...value.sectionA?.[i]})), sectionB: base.sectionB.map((r,i)=>({...r,...value.sectionB?.[i]})), reflection: base.reflection.map((r,i)=>({...r,...value.reflection?.[i]})), nextKpis: base.nextKpis.map((r,i)=>({...r,...value.nextKpis?.[i]})), training: base.training.map((r,i)=>({...r,...value.training?.[i]})) };
}

const isManagerOnlyCompetency = (group:string) => group.includes("managers only");
function isManagerCategory(staff:StaffRecord) { return staff.category?.trim().toLowerCase()==="manager"; }
function applicableSectionARows(staff:StaffRecord) { return sectionA.filter(([group])=>isManagerCategory(staff)||!isManagerOnlyCompetency(group)).length; }
function scoreAverage(rows: RatingRow[]) { const values = rows.flatMap(r=>r.manager ? [Number(r.manager)] : []); return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null; }

export function PdrForm({ row, cycleName = "2026 Year-End Performance and Development Review", previewStaff, accessRole }: { row?: DashboardRow; cycleName?: string; previewStaff?: StaffRecord; accessRole?: CompanyAccess["role"] }) {
  const staff = row?.staff || previewStaff || { id:"preview",employee_id:"",full_name:"",email:null,department:null,position:null,category:null,manager_email:null,hod_name:null,head_of_division:null,is_manager:false,is_confirmation_staff:false };
  const [data,setData] = useState<PdrData>(()=>mergeData(row?.form_data));
  const [active,setActive] = useState("particulars"); const [saving,setSaving] = useState(false); const [message,setMessage] = useState(""); const [currentStage,setCurrentStage]=useState<WorkflowStage>(row?.workflow_stage||"employee_draft");
  const [returnOpen,setReturnOpen]=useState(false); const [returnReason,setReturnReason]=useState(""); const [returnStage,setReturnStage]=useState<WorkflowStage>("returned"); const [confirmOpen,setConfirmOpen]=useState(false);
  const [loadedRowId,setLoadedRowId]=useState(""); const [autoSaveStatus,setAutoSaveStatus]=useState("");
  const lastSavedSnapshot=useRef(""); const autoSaveSequence=useRef(0);
  useEffect(()=>{const next=mergeData(row?.form_data);setData(next);lastSavedSnapshot.current=JSON.stringify(next);setLoadedRowId(row?.id||"");setCurrentStage(row?.workflow_stage||"employee_draft");setMessage("");setAutoSaveStatus("");setReturnOpen(false);setReturnReason("");setConfirmOpen(false);},[row?.id]);
  const managerCategory=isManagerCategory(staff);
  const expectedRatings=applicableSectionARows(staff);
  const averageA = useMemo(()=>scoreAverage(data.sectionA.slice(0,expectedRatings)),[data.sectionA,expectedRatings]); const averageB = useMemo(()=>scoreAverage(data.sectionB),[data.sectionB]);
  const separateHod=hasSeparateHod(staff);
  const isHr=accessRole==="owner"||accessRole==="editor";
  const employeeStage=["employee_draft","returned"].includes(currentStage);
  const employeeTurn=accessRole==="employee"&&["employee_draft","returned"].includes(currentStage);
  const managerTurn=accessRole==="manager"&&currentStage==="manager_review";
  const hodTurn=accessRole==="hod"&&currentStage==="hod_endorsement";
  const canEdit=!!row&&(isHr||employeeTurn||managerTurn||hodTurn);
  const canEditEmployeeScore=isHr||employeeTurn;
  const canEditManagerScore=isHr||managerTurn;
  const canEditShared=isHr||employeeTurn||managerTurn;
  const canEditDates=isHr||employeeTurn||managerTurn||hodTurn;
  const accessMessage=isHr?"HR administrator access: all sections can be revised.":employeeTurn?"Employee access: complete your self-assessment, KPIs and development needs.":managerTurn?`${firstApproverLabel(staff)} access: review the employee's evidence and enter ratings.`:hodTurn?`${secondApproverLabel(staff)} access: review the completed assessment and add your endorsement.`:"This PDR is read-only at the current workflow stage.";
  const tabs = [["particulars","Particulars"],["a","Section A"],["b","Section B"],["c","Section C"],["d","Section D"],["e","Section E & sign-off"],["review","Review & submit"]] as const;
  const signers = [["Employee","employeeDate",isHr||employeeTurn],[firstApproverLabel(staff),"managerDate",isHr||managerTurn],...(separateHod?[[secondApproverLabel(staff),"hodDate",isHr||hodTurn] as const]:[]),["HR administration (optional)","divisionDate",isHr]] as const;
  const updateRating=(section:"sectionA"|"sectionB",index:number,key:keyof RatingRow,value:string)=>setData(old=>({...old,[section]:old[section].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const updateKpi=(section:"reflection"|"nextKpis",index:number,key:keyof KpiRow,value:string)=>setData(old=>({...old,[section]:old[section].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const nextAction=getNextAction(accessRole,currentStage,staff);
  const returnOptions=getReturnOptions(accessRole,currentStage,separateHod);
  const readiness=useMemo(()=>getReadiness(data,staff,currentStage),[data,staff,currentStage]);
  const readyToSubmit=readiness.every(item=>item.complete);
  const reviewUsesManagerRatings=["manager_review","hod_endorsement","hr_review","completed"].includes(currentStage);
  const sectionACompleted=data.sectionA.slice(0,expectedRatings).filter(row=>(reviewUsesManagerRatings?row.manager:row.employee)!=="").length;
  const sectionBCompleted=data.sectionB.filter(row=>(reviewUsesManagerRatings?row.manager:row.employee)!=="").length;
  const completedKpis=data.nextKpis.filter(kpi=>kpi.kra.trim()&&kpi.kpi.trim()&&kpi.action.trim()).length;
  const completedDevelopmentPlans=data.training.filter(item=>Object.values(item).every(value=>value.trim())).length;
  const developmentPlanRequired=(employeeStage||currentStage==="manager_review")&&completedDevelopmentPlans===0;
  const requiredSignature=currentStage==="manager_review"?"managerDate":currentStage==="hod_endorsement"?"hodDate":employeeStage?"employeeDate":"";
  const hasUnsavedChanges=!!row&&canEdit&&loadedRowId===row.id&&JSON.stringify(data)!==lastSavedSnapshot.current;
  const saveStatusTone=autoSaveStatus.includes("failed")||autoSaveStatus==="Save failed"?"error":hasUnsavedChanges?(autoSaveStatus.startsWith("Saving")?"saving":"unsaved"):"saved";
  const visibleSaveStatus=autoSaveStatus||"All changes saved";
  const activeIndex=Math.max(0,tabs.findIndex(([id])=>id===active));
  const previousTab=tabs[activeIndex-1]; const nextTab=tabs[activeIndex+1];
  const openTab=(id:string)=>{setActive(id);window.requestAnimationFrame(()=>document.querySelector(".pdr-tabs")?.scrollIntoView({behavior:"smooth",block:"start"}));};
  const tabState=(id:string)=>{
    if(id==="review")return readyToSubmit?"complete":"needs-attention";
    const required=readiness.find(item=>item.id===id); if(!required)return "neutral"; if(required.complete)return "complete";
    if((id==="a"&&sectionACompleted)||(id==="b"&&sectionBCompleted)||(id==="c"&&(data.particulars.kpiFrom||data.particulars.kpiTo||data.nextKpis.some(item=>item.kra||item.kpi||item.action)))||(id==="d"&&data.training.some(item=>Object.values(item).some(Boolean)))||(id==="e"&&Object.values(data.signatures).some(Boolean)))return "in-progress";
    return "needs-attention";
  };
  useEffect(()=>{if(!row||!canEdit||loadedRowId!==row.id)return;const snapshot=JSON.stringify(data);if(snapshot===lastSavedSnapshot.current)return;const sequence=++autoSaveSequence.current;setAutoSaveStatus("Unsaved changes");const timer=window.setTimeout(async()=>{setAutoSaveStatus("Saving draft…");try{await savePdrForm(row.id,data as unknown as Record<string,unknown>,currentStage,averageA,"","auto");lastSavedSnapshot.current=snapshot;if(sequence===autoSaveSequence.current)setAutoSaveStatus(`Saved at ${new Intl.DateTimeFormat("en-MY",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`);}catch{if(sequence===autoSaveSequence.current)setAutoSaveStatus("Auto-save failed — select Save changes");}},1000);return()=>window.clearTimeout(timer);},[data,row,canEdit,loadedRowId,currentStage,averageA]);
  useEffect(()=>{if(!hasUnsavedChanges)return;const warnBeforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};const warnBeforeInternalNavigation=(event:MouseEvent)=>{const target=event.target;if(!(target instanceof Element))return;const link=target.closest("a[href]") as HTMLAnchorElement|null;if(!link||link.target==="_blank"||link.hasAttribute("download")||link.href===window.location.href||link.href.startsWith(`${window.location.href}#`))return;if(!window.confirm("Your latest changes have not been saved yet. Leave this page and discard them?")){event.preventDefault();event.stopPropagation();}};window.addEventListener("beforeunload",warnBeforeUnload);document.addEventListener("click",warnBeforeInternalNavigation,true);return()=>{window.removeEventListener("beforeunload",warnBeforeUnload);document.removeEventListener("click",warnBeforeInternalNavigation,true);};},[hasUnsavedChanges]);
  async function save(stage=currentStage,reason="") {
    if(!row){setMessage("Preview only. HR must create the 2026 cycle before this form can be saved.");return false;}
    setSaving(true);setMessage("");setAutoSaveStatus("Saving draft…");const changed=stage!==currentStage;const nextData={...data,workflow:reason?{returnReason:reason,returnedAt:new Date().toISOString(),returnedByRole:accessRole||"reviewer"}:changed?{...data.workflow,returnReason:""}:data.workflow};
    try{const result=await savePdrForm(row.id,nextData as unknown as Record<string,unknown>,stage,averageA,reason);setData(nextData);lastSavedSnapshot.current=JSON.stringify(nextData);setAutoSaveStatus(`Saved at ${new Intl.DateTimeFormat("en-MY",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`);setCurrentStage(stage);setReturnOpen(false);setReturnReason("");const delivery=changed&&result.notificationSent===false?" The workflow was updated, but email delivery is not configured yet.":"";setMessage((stage===currentStage?"Changes saved.":reason?"Returned for correction.":stageMessage(stage,separateHod))+delivery);return true;}
    catch(e){setAutoSaveStatus("Save failed");setMessage(e instanceof Error?e.message:"Could not save.");return false;}
    finally{setSaving(false);}
  }
  return <div className="pdr-document">
    <div className="pdr-actions no-print"><div><h2>{cycleName}</h2><p>{row?`${staff.full_name} · ${staff.department||"Department not set"}`:"Full form preview"}</p></div><div className="pdr-action-controls">{canEdit&&<span className={`autosave-status ${saveStatusTone}`} role="status" aria-live="polite"><i aria-hidden/>{visibleSaveStatus}</span>}<button className="button button-secondary" onClick={()=>window.print()}>Print / Save PDF</button>{canEdit&&<button className="button" disabled={saving} onClick={()=>save()}>{saving?"Saving…":"Save changes"}</button>}</div></div>
    {row&&<WorkflowTracker row={row} stageOverride={currentStage}/>}
    {row&&<p className={`access-guidance no-print ${canEdit?"can-edit":"read-only"}`}>{accessMessage}</p>}
    {data.workflow.returnReason&&currentStage!=="completed"&&<aside className="return-notice no-print" role="status"><strong>Correction requested</strong><p>{data.workflow.returnReason}</p>{data.workflow.returnedAt&&<small>Returned {new Intl.DateTimeFormat("en-MY",{dateStyle:"medium",timeStyle:"short"}).format(new Date(data.workflow.returnedAt))}</small>}</aside>}
    <div className="pdr-tabs no-print" role="tablist">{tabs.map(([id,label])=>{const state=tabState(id);return <button key={id} className={active===id?"active":""} onClick={()=>openTab(id)}><span>{label}</span>{state!=="neutral"&&<small className={`tab-state ${state}`}>{state==="complete"?"✓ Complete":state==="in-progress"?"● In progress":"! Needs attention"}</small>}</button>})}</div>
    {message&&<p className="pdr-message no-print" role="status">{message}</p>}
    <header className="pdr-print-header"><h1>Performance and Development Review Year End</h1></header>

    <section className={`pdr-section ${active!=="particulars"?"tab-hidden":""}`}><h3>Employee particulars</h3><div className="pdr-particulars">
      <Field label="Name" value={staff.full_name}/><Field label="Join date" type="date" value={data.particulars.joinDate} disabled={!isHr} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,joinDate:v}}))}/>
      <Field label="Reviewing manager" value={staff.manager_email||""}/><Field label="Date of PDR" type="date" value={data.particulars.pdrDate} disabled={!canEdit} incomplete={employeeStage&&!data.particulars.pdrDate} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,pdrDate:v}}))}/>
      <Field label="Position" value={staff.position||""}/><Field label="Confirmation due date" type="date" value={data.particulars.confirmationDueDate} disabled={!isHr} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,confirmationDueDate:v}}))}/>
      <Field label="Division / Department" value={staff.department||""}/><Field label="Last PDR date" type="date" value={data.particulars.lastPdrDate} disabled={!isHr} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,lastPdrDate:v}}))}/>
      <Field label="Category" value={staff.category||""}/>
    </div><div className="rating-guide"><h4>Performance rating scale</h4><div>{[["0–1","Unsatisfactory"],["2","Improvement needed"],["3","Competent"],["4","Commendable"],["5","Exceptional performance"]].map(([n,t])=><span key={n}><b>{n}</b>{t}</span>)}</div></div></section>

    <RatingSection id="a" title="Section A Core Competencies" rows={sectionA} values={data.sectionA} active={active} onChange={(i,k,v)=>updateRating("sectionA",i,k,v)} average={averageA} canEditEmployee={canEditEmployeeScore} canEditManager={canEditManagerScore} canEditComments={canEditShared} requiredEmployeeCount={employeeStage?expectedRatings:0} requiredManagerCount={currentStage==="manager_review"?expectedRatings:0} applicableRowCount={expectedRatings} applicabilityNote={managerCategory?undefined:"Management and leadership is applicable to the Manager category only."}/>
    <RatingSection id="b" title="Section B Behavioral Appraisal" rows={sectionB} values={data.sectionB} active={active} onChange={(i,k,v)=>updateRating("sectionB",i,k,v)} average={averageB} canEditEmployee={canEditEmployeeScore} canEditManager={canEditManagerScore} canEditComments={canEditShared} requiredEmployeeCount={employeeStage?sectionB.length:0} requiredManagerCount={currentStage==="manager_review"?sectionB.length:0}/>

    <section className={`pdr-section ${active!=="c"?"tab-hidden":""}`}><h3>Section C KRAs and KPIs</h3><p className="pdr-help">Applicable for executive and managerial positions. Reflect on last year’s KPIs and agree the next 12 months’ objectives with the reviewing manager.</p>
      <h4>Reflection of last year’s KPI</h4><KpiTable rows={data.reflection} rating editable={canEditShared} onChange={(i,k,v)=>updateKpi("reflection",i,k,v)}/>
      <h4>KRAs and KPIs for next evaluation period</h4><div className="pdr-period"><Field label="From" type="date" value={data.particulars.kpiFrom} disabled={!canEditDates} incomplete={employeeStage&&!data.particulars.kpiFrom} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,kpiFrom:v}}))}/><Field label="To" type="date" value={data.particulars.kpiTo} disabled={!canEditDates} incomplete={employeeStage&&!data.particulars.kpiTo} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,kpiTo:v}}))}/></div><KpiTable rows={data.nextKpis} editable={canEditShared} highlightFirstIncomplete={employeeStage&&completedKpis===0} onChange={(i,k,v)=>updateKpi("nextKpis",i,k,v)}/>
    </section>

    <section className={`pdr-section ${active!=="d"?"tab-hidden":""}`}><h3>Section D Training and Development Needs</h3><p className="pdr-help">Complete at least one development plan covering the required competency, learning method, programme, priority, target date and expected result.</p><div className="pdr-table-wrap"><table className="pdr-table training-table"><thead><tr><th>No.</th><th>Specific competencies</th><th>Type</th><th>Targeted programme and provider</th><th>Priority</th><th>Target date</th><th>Expected result</th></tr></thead><tbody>{data.training.map((r,i)=><tr key={i}><td>{i+1}</td>{(["competency","type","programme","priority","targetDate","expectedResult"] as const).map(k=>{const incomplete=developmentPlanRequired&&i===0&&!r[k];return <td key={k}>{k==="type"?<select className={incomplete?"required-incomplete":""} aria-invalid={incomplete} disabled={!canEditShared} value={r[k]} onChange={e=>setData(d=>({...d,training:d.training.map((x,j)=>j===i?{...x,[k]:e.target.value}:x)}))}><option value=""></option><option>L</option><option>SS</option><option>T</option></select>:k==="priority"?<select className={incomplete?"required-incomplete":""} aria-invalid={incomplete} disabled={!canEditShared} value={r[k]} onChange={e=>setData(d=>({...d,training:d.training.map((x,j)=>j===i?{...x,[k]:e.target.value}:x)}))}><option value=""></option><option>High</option><option>Medium</option><option>Low</option></select>:<textarea className={incomplete?"required-incomplete":""} aria-invalid={incomplete} disabled={!canEditShared} value={r[k]} onChange={e=>setData(d=>({...d,training:d.training.map((x,j)=>j===i?{...x,[k]:e.target.value}:x)}))}/>}</td>})}</tr>)}</tbody></table></div></section>

    <section className={`pdr-section ${active!=="e"?"tab-hidden":""}`}><h3>Sign-off and endorsement</h3><div className="signature-grid">{signers.map(([label,key,editable])=><label key={key}><b>{label}</b><span>Electronic acknowledgement</span><input className={requiredSignature===key&&!data.signatures[key]?"required-incomplete":""} aria-invalid={requiredSignature===key&&!data.signatures[key]} type="date" disabled={!editable} value={data.signatures[key]} onChange={e=>setData(d=>({...d,signatures:{...d.signatures,[key]:e.target.value}}))}/></label>)}</div>
      {staff.is_confirmation_staff&&<><h3>Section E Staff Confirmation Only</h3><div className="confirmation-choice"><label><input type="radio" name="decision" disabled={!isHr} checked={data.confirmation.decision==="confirm"} onChange={()=>setData(d=>({...d,confirmation:{...d.confirmation,decision:"confirm"}}))}/> Confirm</label><label><input type="radio" name="decision" disabled={!isHr} checked={data.confirmation.decision==="extend"} onChange={()=>setData(d=>({...d,confirmation:{...d.confirmation,decision:"extend"}}))}/> Extend</label></div><label className="pdr-long-field">Remarks<textarea disabled={!isHr} value={data.confirmation.remarks} onChange={e=>setData(d=>({...d,confirmation:{...d.confirmation,remarks:e.target.value}}))}/></label></>}
      {canEdit&&<><div className="pdr-final-actions no-print">{!!returnOptions.length&&<button className="button return-button" disabled={saving} onClick={()=>{setReturnStage(returnOptions[0].stage);setReturnOpen(true)}}>Return for correction</button>}<button className="button button-secondary" disabled={saving} onClick={()=>save()}>Save changes</button>{nextAction&&<button className="button" disabled={saving} onClick={()=>setActive("review")}>Review before submitting</button>}</div>{returnOpen&&<section className="return-panel no-print" aria-label="Return PDR for correction"><h4>Return for correction</h4><p>The reason will be shown to the person responsible for the next correction.</p>{returnOptions.length>1&&<label>Return to<select value={returnStage} onChange={event=>setReturnStage(event.target.value as WorkflowStage)}>{returnOptions.map(option=><option key={option.stage} value={option.stage}>{option.label}</option>)}</select></label>}<label>Correction required<textarea required value={returnReason} onChange={event=>setReturnReason(event.target.value)} placeholder="Explain clearly what must be corrected"/></label><div><button className="button button-secondary" disabled={saving} onClick={()=>{setReturnOpen(false);setReturnReason("")}}>Cancel</button><button className="button return-button" disabled={saving||!returnReason.trim()} onClick={()=>save(returnStage,returnReason.trim())}>{saving?"Returning…":"Send back"}</button></div></section>}</>}
    </section>

    <section className={`pdr-section review-submit-section ${active!=="review"?"tab-hidden":""}`}><div className="review-submit-heading"><div><p className="eyebrow">Final check</p><h3>Review before submitting</h3><p>Confirm that the required information is complete. Select an incomplete item to return to that section.</p></div><span className={`readiness-score ${readyToSubmit?"is-ready":"needs-work"}`}>{readiness.filter(item=>item.complete).length}/{readiness.length} ready</span></div>
      <div className="readiness-list" aria-label="Submission readiness checklist">{readiness.map(item=><button key={item.label} className={item.complete?"complete":"incomplete"} onClick={()=>openTab(item.id)}><span aria-hidden>{item.complete?"✓":"!"}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span><b>{item.complete?"Complete":"Needs attention"}</b></button>)}</div>
      <div className="review-summary-grid"><article><span>Employee</span><strong>{staff.full_name}</strong><small>{staff.position||"Position not set"} · {staff.department||"Department not set"}</small></article><article><span>Ratings completed</span><strong>{sectionACompleted}/{expectedRatings} · {sectionBCompleted}/{sectionB.length}</strong><small>Section A · Section B</small></article><article><span>Next-period KPIs</span><strong>{completedKpis}</strong><small>{data.particulars.kpiFrom&&data.particulars.kpiTo?`${data.particulars.kpiFrom} to ${data.particulars.kpiTo}`:"KPI period not completed"}</small></article><article><span>Development plans</span><strong>{completedDevelopmentPlans}</strong><small>Complete training and development entries recorded</small></article></div>
      {canEdit&&nextAction&&<div className="submit-confirmation no-print"><div><strong>{readyToSubmit?"Ready to submit":"Complete the highlighted items first"}</strong><p>{readyToSubmit?"Your saved information will move to the next person in the approval route.":"Your draft remains saved. Open each item marked Needs attention and complete it before submitting."}</p></div><div><button className="button button-secondary" disabled={saving} onClick={()=>save()}>Save draft</button><button className="button" disabled={saving||!readyToSubmit} onClick={()=>setConfirmOpen(true)}>{nextAction.label}</button></div></div>}
    </section>
    <div className="pdr-section-navigation no-print"><span><b>Section {activeIndex+1} of {tabs.length}</b><small>{tabs[activeIndex][1]}</small></span><div>{previousTab&&<button className="button button-secondary" disabled={saving} onClick={()=>openTab(previousTab[0])}>← Previous</button>}{nextTab&&<button className="button" disabled={saving} onClick={async()=>{if(!canEdit||await save())openTab(nextTab[0]);}}>{saving?"Saving…":canEdit?"Save & continue":"Next section"} →</button>}</div></div>
    {confirmOpen&&nextAction&&<div className="submission-confirm-layer no-print" role="presentation"><button className="submission-confirm-backdrop" aria-label="Cancel submission" onClick={()=>setConfirmOpen(false)}/><section className="submission-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="submission-confirm-title"><span className="submission-confirm-icon" aria-hidden>✓</span><p className="eyebrow">Final confirmation</p><h2 id="submission-confirm-title">Submit this PDR?</h2><p>The form will move to the next person in the approval route. Editing for your current stage will be locked unless it is returned for correction.</p><div><button className="button button-secondary" disabled={saving} onClick={()=>setConfirmOpen(false)}>Cancel</button><button className="button" disabled={saving} onClick={async()=>{if(await save(nextAction.stage))setConfirmOpen(false);}}>{saving?"Submitting…":"Confirm submission"}</button></div></section></div>}
  </div>;
}

function getReadiness(data:PdrData,staff:StaffRecord,stage:WorkflowStage):ReadinessItem[]{
  const expectedA=applicableSectionARows(staff);
  const ratingKey:keyof RatingRow=stage==="manager_review"?"manager":"employee";
  const completedA=data.sectionA.slice(0,expectedA).filter(row=>row[ratingKey]!=="").length;
  const completedB=data.sectionB.filter(row=>row[ratingKey]!=="").length;
  const fullKpis=data.nextKpis.filter(row=>row.kra.trim()&&row.kpi.trim()&&row.action.trim()).length;
  const fullDevelopmentPlans=data.training.filter(row=>Object.values(row).every(value=>value.trim())).length;
  if(stage==="hod_endorsement") return [{id:"e",label:"N+2 electronic acknowledgement",detail:data.signatures.hodDate?"Endorsement date recorded":"Enter the endorsement date",complete:!!data.signatures.hodDate}];
  if(stage==="hr_review"||stage==="completed") return [{id:"review",label:"PDR received by HR",detail:"The appraisal workflow has reached HR",complete:true}];
  if(stage==="manager_review") return [
    {id:"a",label:"Section A manager ratings",detail:`${completedA} of ${expectedA} applicable ratings completed`,complete:completedA===expectedA},
    {id:"b",label:"Section B manager ratings",detail:`${completedB} of ${sectionB.length} ratings completed`,complete:completedB===sectionB.length},
    {id:"d",label:"Training and development needs",detail:fullDevelopmentPlans?`${fullDevelopmentPlans} complete development plan${fullDevelopmentPlans===1?"":"s"} recorded`:"Complete at least one development plan",complete:fullDevelopmentPlans>0},
    {id:"e",label:"Manager electronic acknowledgement",detail:data.signatures.managerDate?"Acknowledgement date recorded":"Enter the manager acknowledgement date",complete:!!data.signatures.managerDate},
  ];
  return [
    {id:"particulars",label:"PDR date",detail:data.particulars.pdrDate?"Date recorded":"Enter the date of the PDR discussion",complete:!!data.particulars.pdrDate},
    {id:"a",label:"Section A self-assessment",detail:`${completedA} of ${expectedA} applicable ratings completed`,complete:completedA===expectedA},
    {id:"b",label:"Section B self-assessment",detail:`${completedB} of ${sectionB.length} ratings completed`,complete:completedB===sectionB.length},
    {id:"c",label:"KPI period and objectives",detail:fullKpis?`${fullKpis} complete KPI${fullKpis===1?"":"s"} recorded`:"Complete the KPI dates and at least one objective",complete:!!data.particulars.kpiFrom&&!!data.particulars.kpiTo&&fullKpis>0},
    {id:"d",label:"Training and development needs",detail:fullDevelopmentPlans?`${fullDevelopmentPlans} complete development plan${fullDevelopmentPlans===1?"":"s"} recorded`:"Complete at least one development plan",complete:fullDevelopmentPlans>0},
    {id:"e",label:"Employee electronic acknowledgement",detail:data.signatures.employeeDate?"Acknowledgement date recorded":"Enter your acknowledgement date",complete:!!data.signatures.employeeDate},
  ];
}

function Field({label,value,onChange,type="text",disabled=false,incomplete=false}:{label:string;value:string;onChange?:(value:string)=>void;type?:string;disabled?:boolean;incomplete?:boolean}) { return <label className="pdr-field"><span>{label}</span><input className={incomplete?"required-incomplete":""} aria-invalid={incomplete} type={type} value={value} disabled={disabled} readOnly={!onChange} onChange={e=>onChange?.(e.target.value)}/></label>; }
function ScoreSelect({value,onChange,label,disabled=false,required=false}:{value:Score;onChange:(v:Score)=>void;label:string;disabled?:boolean;required?:boolean}) { const incomplete=required&&!value; return <select className={incomplete?"required-incomplete":""} aria-invalid={incomplete} aria-label={label} disabled={disabled} value={value} onChange={e=>onChange(e.target.value as Score)}><option value="">—</option>{[0,1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select>; }
function RatingSection({id,title,rows,values,active,onChange,average,canEditEmployee,canEditManager,canEditComments,requiredEmployeeCount=0,requiredManagerCount=0,applicableRowCount=rows.length,applicabilityNote}:{id:string;title:string;rows:readonly (readonly [string,string])[];values:RatingRow[];active:string;onChange:(i:number,k:keyof RatingRow,v:string)=>void;average:number|null;canEditEmployee:boolean;canEditManager:boolean;canEditComments:boolean;requiredEmployeeCount?:number;requiredManagerCount?:number;applicableRowCount?:number;applicabilityNote?:string}) { return <section className={`pdr-section ${active!==id?"tab-hidden":""}`}><h3>{title}</h3>{applicabilityNote&&<p className="pdr-help applicability-note">{applicabilityNote} The rows are excluded from completion and average-rating calculations.</p>}<div className="pdr-table-wrap"><table className="pdr-table rating-table"><thead><tr><th>Competency</th><th>Performance standard</th><th>Employee /5</th><th>Manager /5</th><th>Supporting comments and work examples</th></tr></thead><tbody>{rows.map(([group,text],i)=>{const applicable=i<applicableRowCount;return <tr key={i} className={applicable?"":"not-applicable-row"}><td><b>{group}</b>{!applicable&&<span className="not-applicable-badge">Not applicable</span>}</td><td>{text}</td>{applicable?<><td><ScoreSelect disabled={!canEditEmployee} required={i<requiredEmployeeCount} label={`Employee score ${i+1}`} value={values[i]?.employee||""} onChange={v=>onChange(i,"employee",v)}/></td><td><ScoreSelect disabled={!canEditManager} required={i<requiredManagerCount} label={`Manager score ${i+1}`} value={values[i]?.manager||""} onChange={v=>onChange(i,"manager",v)}/></td><td><textarea disabled={!canEditComments} value={values[i]?.comments||""} onChange={e=>onChange(i,"comments",e.target.value)}/></td></>:<><td><span className="not-applicable-value">N/A</span></td><td><span className="not-applicable-value">N/A</span></td><td><span className="not-applicable-value">Not applicable to this employee category</span></td></>}</tr>})}</tbody><tfoot><tr><th colSpan={3}>Average performance rating</th><th>{average==null?"—":average.toFixed(2)}</th><th></th></tr></tfoot></table></div></section>; }
function KpiTable({rows,rating=false,editable,onChange,highlightFirstIncomplete=false}:{rows:KpiRow[];rating?:boolean;editable:boolean;onChange:(i:number,k:keyof KpiRow,v:string)=>void;highlightFirstIncomplete?:boolean}) { return <div className="pdr-table-wrap"><table className="pdr-table kpi-table"><thead><tr><th>Key Result Area KRA</th><th>Key Performance Indicator KPI and measurement</th><th>Action plan</th>{rating&&<th>Rating 1–5</th>}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><textarea className={highlightFirstIncomplete&&i===0&&!r.kra?"required-incomplete":""} aria-invalid={highlightFirstIncomplete&&i===0&&!r.kra} disabled={!editable} value={r.kra} onChange={e=>onChange(i,"kra",e.target.value)}/></td><td><textarea className={highlightFirstIncomplete&&i===0&&!r.kpi?"required-incomplete":""} aria-invalid={highlightFirstIncomplete&&i===0&&!r.kpi} disabled={!editable} value={r.kpi} onChange={e=>onChange(i,"kpi",e.target.value)}/></td><td><textarea className={highlightFirstIncomplete&&i===0&&!r.action?"required-incomplete":""} aria-invalid={highlightFirstIncomplete&&i===0&&!r.action} disabled={!editable} value={r.action} onChange={e=>onChange(i,"action",e.target.value)}/></td>{rating&&<td><ScoreSelect disabled={!editable} label={`KPI rating ${i+1}`} value={r.rating||""} onChange={v=>onChange(i,"rating",v)}/></td>}</tr>)}</tbody></table></div>; }

function getNextAction(role: CompanyAccess["role"]|undefined, stage: WorkflowStage, staff:StaffRecord) {
  if ((role === "employee" || role === "owner" || role === "editor") && ["employee_draft","returned"].includes(stage)) return { stage:"manager_review" as const, label:"Submit to assigned superior" };
  if ((role === "manager" || role === "owner" || role === "editor") && stage === "manager_review") { const next=stageAfterSuperior(staff); return {stage:next,label:next==="hod_endorsement"?`Send to ${secondApproverLabel(staff)}`:"Send to HR"}; }
  if ((role === "hod" || role === "owner" || role === "editor") && stage === "hod_endorsement") return { stage:"completed" as const, label:"Approve and send to HR" };
  if ((role === "owner" || role === "editor") && stage === "hr_review") return { stage:"completed" as const, label:"Mark as received by HR" };
  return null;
}

function getReturnOptions(role:CompanyAccess["role"]|undefined,stage:WorkflowStage,separateHod:boolean):{stage:WorkflowStage;label:string}[]{
  if(role==="manager"&&stage==="manager_review")return[{stage:"returned",label:"Employee"}];
  if(role==="hod"&&stage==="hod_endorsement")return[{stage:"manager_review",label:"Manager"}];
  if((role==="owner"||role==="editor")&&stage==="manager_review")return[{stage:"returned",label:"Employee"}];
  if((role==="owner"||role==="editor")&&stage==="hod_endorsement")return[{stage:"manager_review",label:"Manager"},{stage:"returned",label:"Employee"}];
  if((role==="owner"||role==="editor")&&["hr_review","completed"].includes(stage))return[...(separateHod?[{stage:"hod_endorsement" as const,label:"HOD"}]:[]),{stage:"manager_review",label:separateHod?"Manager":"Assigned superior"},{stage:"returned",label:"Employee"}];
  return[];
}

function stageMessage(stage: WorkflowStage,separateHod:boolean) {
  if (stage === "manager_review") return "Submitted to the assigned superior.";
  if (stage === "hod_endorsement") return "N+1 review completed and sent to the N+2 approver.";
  if (stage === "hr_review") return separateHod?"N+2 approval completed and sent to HR.":"Superior review completed and sent to HR.";
  if (stage === "completed") return "PDR completed and received by HR.";
  return "Changes saved.";
}
