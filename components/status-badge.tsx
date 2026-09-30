import type { SubmissionStatus } from "@/lib/data/types";

const labels: Record<SubmissionStatus, string> = { submitted: "Submitted", late: "Late", overdue: "Overdue", not_submitted: "Not submitted" };
export function StatusBadge({ status }: { status: SubmissionStatus }) { return <span className={`status status-${status}`}><i />{labels[status]}</span>; }
