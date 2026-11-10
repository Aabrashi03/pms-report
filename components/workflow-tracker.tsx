import type { DashboardRow, StaffRecord, WorkflowStage } from "@/lib/data/client";
import { workflowSteps } from "@/lib/workflow-route";

const defaultStages: { key: WorkflowStage; label: string }[] = [
  { key: "employee_draft", label: "Employee" },
  { key: "manager_review", label: "Manager" },
  { key: "hod_endorsement", label: "HOD" },
  { key: "hr_review", label: "HR" },
  { key: "completed", label: "Completed" },
];

const dates:Partial<Record<WorkflowStage,keyof DashboardRow>>={employee_draft:"employee_submitted_at",manager_review:"manager_submitted_at",hod_endorsement:"hod_endorsed_at",hr_review:"hr_reviewed_at",completed:"hr_reviewed_at"};

export function workflowPosition(stage?: string) {
  if (stage === "returned") return 0;
  const index = defaultStages.findIndex(item => item.key === stage);
  return index < 0 ? 0 : index;
}

export function workflowLabel(stage?: string,staff?:StaffRecord) {
  if (stage === "returned") return "Returned to employee";
  if(staff&&stage==="manager_review")return workflowSteps(staff,stage).find(item=>item.key===stage)?.label||"Assigned superior";
  return defaultStages.find(item => item.key === stage)?.label || "Employee";
}

export function WorkflowTracker({ row, stageOverride, compact = false }: { row: DashboardRow; stageOverride?: WorkflowStage; compact?: boolean }) {
  const currentStage = stageOverride || row.workflow_stage || "employee_draft";
  const stages=workflowSteps(row.staff,currentStage);
  const current=currentStage==="returned"?0:Math.max(0,stages.findIndex(item=>item.key===currentStage));
  const currentLabel=currentStage==="returned"?"Returned to employee":stages.find(item=>item.key===currentStage)?.label||"Employee";
  return <section className={`stage-tracker ${compact ? "stage-tracker-compact" : ""}`} aria-label={`PDR workflow: ${currentLabel}`}>
    <div className="stage-tracker-heading"><div><span>Workflow progress</span><strong>{currentLabel}</strong></div><small>{currentStage === "returned" ? "Amendments requested" : currentStage === "completed" ? "Review completed" : "Current responsibility"}</small></div>
    <ol>{stages.map((stage,index) => {
      const isDone = currentStage === "completed" || index < current;
      const isCurrent = index === current && currentStage !== "completed";
      const dateKey=dates[stage.key];
      const date = dateKey?row[dateKey] as string | null | undefined:null;
      return <li key={stage.key} className={isDone ? "is-done" : isCurrent ? "is-current" : "is-upcoming"} aria-current={isCurrent ? "step" : undefined}>
        <span className="stage-dot">{isDone ? "✓" : index + 1}</span><div><strong>{stage.label}</strong>{!compact && <small>{date ? formatStageDate(date) : isCurrent ? "In progress" : isDone ? "Completed" : "Waiting"}</small>}</div>
      </li>;
    })}</ol>
  </section>;
}

function formatStageDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
