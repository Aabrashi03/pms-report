import type { DashboardRow, WorkflowStage } from "@/lib/data/client";

const stages: { key: WorkflowStage; label: string }[] = [
  { key: "employee_draft", label: "Employee" },
  { key: "manager_review", label: "Manager" },
  { key: "hod_endorsement", label: "HOD" },
  { key: "hr_review", label: "HR" },
  { key: "completed", label: "Completed" },
];

const dates: (keyof DashboardRow)[] = ["employee_submitted_at", "manager_submitted_at", "hod_endorsed_at", "hr_reviewed_at", "hr_reviewed_at"];

export function workflowPosition(stage?: string) {
  if (stage === "returned") return 0;
  const index = stages.findIndex(item => item.key === stage);
  return index < 0 ? 0 : index;
}

export function workflowLabel(stage?: string) {
  if (stage === "returned") return "Returned to employee";
  return stages.find(item => item.key === stage)?.label || "Employee";
}

export function WorkflowTracker({ row, stageOverride, compact = false }: { row: DashboardRow; stageOverride?: WorkflowStage; compact?: boolean }) {
  const currentStage = stageOverride || row.workflow_stage || "employee_draft";
  const current = workflowPosition(currentStage);
  return <section className={`stage-tracker ${compact ? "stage-tracker-compact" : ""}`} aria-label={`PDR workflow: ${workflowLabel(currentStage)}`}>
    <div className="stage-tracker-heading"><div><span>Workflow progress</span><strong>{workflowLabel(currentStage)}</strong></div><small>{currentStage === "returned" ? "Amendments requested" : currentStage === "completed" ? "Review completed" : "Current responsibility"}</small></div>
    <ol>{stages.map((stage,index) => {
      const isDone = currentStage === "completed" || index < current;
      const isCurrent = index === current && currentStage !== "completed";
      const date = row[dates[index]] as string | null | undefined;
      return <li key={stage.key} className={isDone ? "is-done" : isCurrent ? "is-current" : "is-upcoming"} aria-current={isCurrent ? "step" : undefined}>
        <span className="stage-dot">{isDone ? "✓" : index + 1}</span><div><strong>{stage.label}</strong>{!compact && <small>{date ? formatStageDate(date) : isCurrent ? "In progress" : isDone ? "Completed" : "Waiting"}</small>}</div>
      </li>;
    })}</ol>
  </section>;
}

function formatStageDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
