export type SubmissionStatus = "not_submitted" | "submitted" | "late" | "overdue";
export const RATINGS = ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Below Expectations", "Unsatisfactory"] as const;

export function deriveStatus(submissionDate: string | null, dueDate: string, today = new Date()): SubmissionStatus {
  if (submissionDate) return submissionDate <= dueDate ? "submitted" : "late";
  const todayValue = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  return todayValue > dueDate ? "overdue" : "not_submitted";
}
