"use client";

import { useEffect, useMemo, useState } from "react";
import { savePdrForm, type DashboardRow, type StaffRecord, type WorkflowStage } from "@/lib/data/client";
import type { CompanyAccess } from "@/lib/data/team";
import { WorkflowTracker } from "@/components/workflow-tracker";

type Score = "" | "0" | "1" | "2" | "3" | "4" | "5";
type RatingRow = { employee: Score; manager: Score; comments: string };
type KpiRow = { kra: string; kpi: string; action: string; rating?: Score };
type TrainingRow = { competency: string; type: string; programme: string; priority: string; targetDate: string; expectedResult: string };
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

function scoreAverage(rows: RatingRow[]) { const values = rows.flatMap(r=>r.manager ? [Number(r.manager)] : []); return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null; }

export function PdrForm({ row, cycleName = "2026 Year-End Performance and Development Review", previewStaff, accessRole }: { row?: DashboardRow; cycleName?: string; previewStaff?: StaffRecord; accessRole?: CompanyAccess["role"] }) {
  const staff = row?.staff || previewStaff || { id:"preview",employee_id:"",full_name:"",email:null,department:null,position:null,manager_email:null,hod_name:null,head_of_division:null,is_manager:false,is_confirmation_staff:false };
  const [data,setData] = useState<PdrData>(()=>mergeData(row?.form_data));
  const [active,setActive] = useState("particulars"); const [saving,setSaving] = useState(false); const [message,setMessage] = useState(""); const [currentStage,setCurrentStage]=useState<WorkflowStage>(row?.workflow_stage||"employee_draft");
  const [returnOpen,setReturnOpen]=useState(false); const [returnReason,setReturnReason]=useState(""); const [returnStage,setReturnStage]=useState<WorkflowStage>("returned");
  useEffect(()=>{setData(mergeData(row?.form_data));setCurrentStage(row?.workflow_stage||"employee_draft");setMessage("");setReturnOpen(false);setReturnReason("");},[row?.id]);
  const averageA = useMemo(()=>scoreAverage(data.sectionA),[data.sectionA]); const averageB = useMemo(()=>scoreAverage(data.sectionB),[data.sectionB]);
  const isHr=accessRole==="owner"||accessRole==="editor";
  const employeeTurn=accessRole==="employee"&&["employee_draft","returned"].includes(currentStage);
  const managerTurn=accessRole==="manager"&&currentStage==="manager_review";
  const hodTurn=accessRole==="hod"&&currentStage==="hod_endorsement";
  const canEdit=!!row&&(isHr||employeeTurn||managerTurn||hodTurn);
  const canEditEmployeeScore=isHr||employeeTurn;
  const canEditManagerScore=isHr||managerTurn;
  const canEditShared=isHr||employeeTurn||managerTurn;
  const canEditDates=isHr||employeeTurn||managerTurn||hodTurn;
  const accessMessage=isHr?"HR administrator access: all sections can be revised.":employeeTurn?"Employee access: complete your self-assessment, KPIs and development needs.":managerTurn?"Manager access: review the employee's evidence and enter manager ratings.":hodTurn?"HOD access: review the completed assessment and add your endorsement.":"This PDR is read-only at the current workflow stage.";
  const tabs = [["particulars","Particulars"],["a","Section A"],["b","Section B"],["c","Section C"],["d","Section D"],["e","Section E & sign-off"]];
  const signers = [["Employee","employeeDate",isHr||employeeTurn],["Immediate superior","managerDate",isHr||managerTurn],["Head of Department","hodDate",isHr||hodTurn],["Head of Division","divisionDate",isHr]] as const;
  const updateRating=(section:"sectionA"|"sectionB",index:number,key:keyof RatingRow,value:string)=>setData(old=>({...old,[section]:old[section].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const updateKpi=(section:"reflection"|"nextKpis",index:number,key:keyof KpiRow,value:string)=>setData(old=>({...old,[section]:old[section].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const nextAction=getNextAction(accessRole,currentStage);
  const returnOptions=getReturnOptions(accessRole,currentStage);
  async function save(stage=currentStage,reason="") { if(!row){setMessage("Preview only. HR must create the 2026 cycle before this form can be saved.");return;} setSaving(true);setMessage("");const changed=stage!==currentStage;const nextData={...data,workflow:reason?{returnReason:reason,returnedAt:new Date().toISOString(),returnedByRole:accessRole||"reviewer"}:changed?{...data.workflow,returnReason:""}:data.workflow};try{const result=await savePdrForm(row.id,nextData as unknown as Record<string,unknown>,stage,averageA,reason);setData(nextData);setCurrentStage(stage);setReturnOpen(false);setReturnReason("");const delivery=changed&&result.notificationSent===false?" The workflow was updated, but email delivery is not configured yet.":"";setMessage((stage===currentStage?"Changes saved.":reason?"Returned for correction.":stageMessage(stage))+delivery);}catch(e){setMessage(e instanceof Error?e.message:"Could not save.");}finally{setSaving(false);} }
  return <div className="pdr-document">
    <div className="pdr-actions no-print"><div><span className="pdr-code">SPB/HR/2026_YE</span><h2>{cycleName}</h2><p>{row?`${staff.full_name} · ${staff.department||"Department not set"}`:"Full form preview"}</p></div><div><button className="button button-secondary" onClick={()=>window.print()}>Print / Save PDF</button>{canEdit&&<button className="button" disabled={saving} onClick={()=>save()}>{saving?"Saving…":"Save changes"}</button>}</div></div>
    {row&&<WorkflowTracker row={row} stageOverride={currentStage}/>}
    {row&&<p className={`access-guidance no-print ${canEdit?"can-edit":"read-only"}`}>{accessMessage}</p>}
    {data.workflow.returnReason&&currentStage!=="completed"&&<aside className="return-notice no-print" role="status"><strong>Correction requested</strong><p>{data.workflow.returnReason}</p>{data.workflow.returnedAt&&<small>Returned {new Intl.DateTimeFormat("en-MY",{dateStyle:"medium",timeStyle:"short"}).format(new Date(data.workflow.returnedAt))}</small>}</aside>}
    <div className="pdr-tabs no-print" role="tablist">{tabs.map(([id,label])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}>{label}</button>)}</div>
    {message&&<p className="pdr-message no-print" role="status">{message}</p>}
    <header className="pdr-print-header"><span>SPB/HR/2026_YE</span><h1>Performance and Development Review Year End</h1></header>

    <section className={`pdr-section ${active!=="particulars"?"tab-hidden":""}`}><h3>Employee particulars</h3><div className="pdr-particulars">
      <Field label="Name" value={staff.full_name}/><Field label="Join date" type="date" value={data.particulars.joinDate} disabled={!isHr} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,joinDate:v}}))}/>
      <Field label="Reviewing manager" value={staff.manager_email||""}/><Field label="Date of PDR" type="date" value={data.particulars.pdrDate} disabled={!canEdit} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,pdrDate:v}}))}/>
      <Field label="Position" value={staff.position||""}/><Field label="Confirmation due date" type="date" value={data.particulars.confirmationDueDate} disabled={!isHr} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,confirmationDueDate:v}}))}/>
      <Field label="Division / Department" value={staff.department||""}/><Field label="Last PDR date" type="date" value={data.particulars.lastPdrDate} disabled={!isHr} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,lastPdrDate:v}}))}/>
    </div><div className="rating-guide"><h4>Performance rating scale</h4><div>{[["0–1","Unsatisfactory"],["2","Improvement needed"],["3","Competent"],["4","Commendable"],["5","Exceptional performance"]].map(([n,t])=><span key={n}><b>{n}</b>{t}</span>)}</div></div></section>

    <RatingSection id="a" title="Section A Core Competencies" rows={sectionA} values={data.sectionA} active={active} onChange={(i,k,v)=>updateRating("sectionA",i,k,v)} average={averageA} canEditEmployee={canEditEmployeeScore} canEditManager={canEditManagerScore} canEditComments={canEditShared}/>
    <RatingSection id="b" title="Section B Behavioral Appraisal" rows={sectionB} values={data.sectionB} active={active} onChange={(i,k,v)=>updateRating("sectionB",i,k,v)} average={averageB} canEditEmployee={canEditEmployeeScore} canEditManager={canEditManagerScore} canEditComments={canEditShared}/>

    <section className={`pdr-section ${active!=="c"?"tab-hidden":""}`}><h3>Section C KRAs and KPIs</h3><p className="pdr-help">Applicable for executive and managerial positions. Reflect on last year’s KPIs and agree the next 12 months’ objectives with the reviewing manager.</p>
      <h4>Reflection of last year’s KPI</h4><KpiTable rows={data.reflection} rating editable={canEditShared} onChange={(i,k,v)=>updateKpi("reflection",i,k,v)}/>
      <h4>KRAs and KPIs for next evaluation period</h4><div className="pdr-period"><Field label="From" type="date" value={data.particulars.kpiFrom} disabled={!canEditDates} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,kpiFrom:v}}))}/><Field label="To" type="date" value={data.particulars.kpiTo} disabled={!canEditDates} onChange={v=>setData(d=>({...d,particulars:{...d.particulars,kpiTo:v}}))}/></div><KpiTable rows={data.nextKpis} editable={canEditShared} onChange={(i,k,v)=>updateKpi("nextKpis",i,k,v)}/>
    </section>

    <section className={`pdr-section ${active!=="d"?"tab-hidden":""}`}><h3>Section D Training and Development Needs</h3><p className="pdr-help">Discuss short-term goals, long-term career plans, operational requirements and learning opportunities.</p><div className="pdr-table-wrap"><table className="pdr-table training-table"><thead><tr><th>No.</th><th>Specific competencies</th><th>Type</th><th>Targeted programme and provider</th><th>Priority</th><th>Target date</th><th>Expected result</th></tr></thead><tbody>{data.training.map((r,i)=><tr key={i}><td>{i+1}</td>{(["competency","type","programme","priority","targetDate","expectedResult"] as const).map(k=><td key={k}>{k==="type"?<select disabled={!canEditShared} value={r[k]} onChange={e=>setData(d=>({...d,training:d.training.map((x,j)=>j===i?{...x,[k]:e.target.value}:x)}))}><option value=""></option><option>L</option><option>SS</option><option>T</option></select>:k==="priority"?<select disabled={!canEditShared} value={r[k]} onChange={e=>setData(d=>({...d,training:d.training.map((x,j)=>j===i?{...x,[k]:e.target.value}:x)}))}><option value=""></option><option>High</option><option>Medium</option><option>Low</option></select>:<textarea disabled={!canEditShared} value={r[k]} onChange={e=>setData(d=>({...d,training:d.training.map((x,j)=>j===i?{...x,[k]:e.target.value}:x)}))}/>}</td>)}</tr>)}</tbody></table></div></section>

    <section className={`pdr-section ${active!=="e"?"tab-hidden":""}`}><h3>Sign-off and endorsement</h3><div className="signature-grid">{signers.map(([label,key,editable])=><label key={key}><b>{label}</b><span>Electronic acknowledgement</span><input type="date" disabled={!editable} value={data.signatures[key]} onChange={e=>setData(d=>({...d,signatures:{...d.signatures,[key]:e.target.value}}))}/></label>)}</div>
      {staff.is_confirmation_staff&&<><h3>Section E Staff Confirmation Only</h3><div className="confirmation-choice"><label><input type="radio" name="decision" disabled={!isHr} checked={data.confirmation.decision==="confirm"} onChange={()=>setData(d=>({...d,confirmation:{...d.confirmation,decision:"confirm"}}))}/> Confirm</label><label><input type="radio" name="decision" disabled={!isHr} checked={data.confirmation.decision==="extend"} onChange={()=>setData(d=>({...d,confirmation:{...d.confirmation,decision:"extend"}}))}/> Extend</label></div><label className="pdr-long-field">Remarks<textarea disabled={!isHr} value={data.confirmation.remarks} onChange={e=>setData(d=>({...d,confirmation:{...d.confirmation,remarks:e.target.value}}))}/></label></>}
      {canEdit&&<><div className="pdr-final-actions no-print">{!!returnOptions.length&&<button className="button return-button" disabled={saving} onClick={()=>{setReturnStage(returnOptions[0].stage);setReturnOpen(true)}}>Return for correction</button>}<button className="button button-secondary" disabled={saving} onClick={()=>save()}>Save changes</button>{nextAction&&<button className="button" disabled={saving} onClick={()=>save(nextAction.stage)}>{nextAction.label}</button>}</div>{returnOpen&&<section className="return-panel no-print" aria-label="Return PDR for correction"><h4>Return for correction</h4><p>The reason will be shown to the person responsible for the next correction.</p>{returnOptions.length>1&&<label>Return to<select value={returnStage} onChange={event=>setReturnStage(event.target.value as WorkflowStage)}>{returnOptions.map(option=><option key={option.stage} value={option.stage}>{option.label}</option>)}</select></label>}<label>Correction required<textarea required value={returnReason} onChange={event=>setReturnReason(event.target.value)} placeholder="Explain clearly what must be corrected"/></label><div><button className="button button-secondary" disabled={saving} onClick={()=>{setReturnOpen(false);setReturnReason("")}}>Cancel</button><button className="button return-button" disabled={saving||!returnReason.trim()} onClick={()=>save(returnStage,returnReason.trim())}>{saving?"Returning…":"Send back"}</button></div></section>}</>}
    </section>
  </div>;
}

function Field({label,value,onChange,type="text",disabled=false}:{label:string;value:string;onChange?:(value:string)=>void;type?:string;disabled?:boolean}) { return <label className="pdr-field"><span>{label}</span><input type={type} value={value} disabled={disabled} readOnly={!onChange} onChange={e=>onChange?.(e.target.value)}/></label>; }
function ScoreSelect({value,onChange,label,disabled=false}:{value:Score;onChange:(v:Score)=>void;label:string;disabled?:boolean}) { return <select aria-label={label} disabled={disabled} value={value} onChange={e=>onChange(e.target.value as Score)}><option value="">—</option>{[0,1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select>; }
function RatingSection({id,title,rows,values,active,onChange,average,canEditEmployee,canEditManager,canEditComments}:{id:string;title:string;rows:readonly (readonly [string,string])[];values:RatingRow[];active:string;onChange:(i:number,k:keyof RatingRow,v:string)=>void;average:number|null;canEditEmployee:boolean;canEditManager:boolean;canEditComments:boolean}) { return <section className={`pdr-section ${active!==id?"tab-hidden":""}`}><h3>{title}</h3><div className="pdr-table-wrap"><table className="pdr-table rating-table"><thead><tr><th>Competency</th><th>Performance standard</th><th>Employee /5</th><th>Manager /5</th><th>Supporting comments and work examples</th></tr></thead><tbody>{rows.map(([group,text],i)=><tr key={i}><td><b>{group}</b></td><td>{text}</td><td><ScoreSelect disabled={!canEditEmployee} label={`Employee score ${i+1}`} value={values[i]?.employee||""} onChange={v=>onChange(i,"employee",v)}/></td><td><ScoreSelect disabled={!canEditManager} label={`Manager score ${i+1}`} value={values[i]?.manager||""} onChange={v=>onChange(i,"manager",v)}/></td><td><textarea disabled={!canEditComments} value={values[i]?.comments||""} onChange={e=>onChange(i,"comments",e.target.value)}/></td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Average performance rating</th><th>{average==null?"—":average.toFixed(2)}</th><th></th></tr></tfoot></table></div></section>; }
function KpiTable({rows,rating=false,editable,onChange}:{rows:KpiRow[];rating?:boolean;editable:boolean;onChange:(i:number,k:keyof KpiRow,v:string)=>void}) { return <div className="pdr-table-wrap"><table className="pdr-table kpi-table"><thead><tr><th>Key Result Area KRA</th><th>Key Performance Indicator KPI and measurement</th><th>Action plan</th>{rating&&<th>Rating 1–5</th>}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><textarea disabled={!editable} value={r.kra} onChange={e=>onChange(i,"kra",e.target.value)}/></td><td><textarea disabled={!editable} value={r.kpi} onChange={e=>onChange(i,"kpi",e.target.value)}/></td><td><textarea disabled={!editable} value={r.action} onChange={e=>onChange(i,"action",e.target.value)}/></td>{rating&&<td><ScoreSelect disabled={!editable} label={`KPI rating ${i+1}`} value={r.rating||""} onChange={v=>onChange(i,"rating",v)}/></td>}</tr>)}</tbody></table></div>; }

function getNextAction(role: CompanyAccess["role"]|undefined, stage: WorkflowStage) {
  if (role === "employee" && ["employee_draft","returned"].includes(stage)) return { stage:"manager_review" as const, label:"Submit to manager" };
  if ((role === "manager" || role === "owner" || role === "editor") && stage === "manager_review") return { stage:"hod_endorsement" as const, label:"Send to HOD" };
  if ((role === "hod" || role === "owner" || role === "editor") && stage === "hod_endorsement") return { stage:"hr_review" as const, label:"Endorse and send to HR" };
  if ((role === "owner" || role === "editor") && stage === "hr_review") return { stage:"completed" as const, label:"Complete PDR" };
  return null;
}

function getReturnOptions(role:CompanyAccess["role"]|undefined,stage:WorkflowStage):{stage:WorkflowStage;label:string}[]{
  if(role==="manager"&&stage==="manager_review")return[{stage:"returned",label:"Employee"}];
  if(role==="hod"&&stage==="hod_endorsement")return[{stage:"manager_review",label:"Manager"}];
  if((role==="owner"||role==="editor")&&stage==="manager_review")return[{stage:"returned",label:"Employee"}];
  if((role==="owner"||role==="editor")&&stage==="hod_endorsement")return[{stage:"manager_review",label:"Manager"},{stage:"returned",label:"Employee"}];
  if((role==="owner"||role==="editor")&&stage==="hr_review")return[{stage:"hod_endorsement",label:"HOD"},{stage:"manager_review",label:"Manager"},{stage:"returned",label:"Employee"}];
  return[];
}

function stageMessage(stage: WorkflowStage) {
  if (stage === "manager_review") return "Submitted to the reviewing manager.";
  if (stage === "hod_endorsement") return "Manager review completed and sent to the HOD.";
  if (stage === "hr_review") return "HOD endorsement completed and sent to HR.";
  if (stage === "completed") return "PDR completed.";
  return "Changes saved.";
}
