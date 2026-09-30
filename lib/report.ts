export type ReportRow = {
  derived_status: string; rating: string | null; reviewer_name: string | null;
  staff: { department: string | null };
};
export const ratingLabels = ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Below Expectations', 'Unsatisfactory'];
export const percent = (part: number, total: number) => total ? Math.round(part / total * 100) : null;
export const displayPercent = (value: number | null) => value === null ? 'N/A' : `${value}%`;
export const isSubmitted = (row: ReportRow) => ['submitted', 'late'].includes(row.derived_status);
export function summarise(rows: ReportRow[]) {
  const submitted = rows.filter(isSubmitted);
  const onTime = rows.filter(r => r.derived_status === 'submitted').length;
  const late = rows.filter(r => r.derived_status === 'late').length;
  const overdue = rows.filter(r => r.derived_status === 'overdue').length;
  const pending = rows.filter(r => r.derived_status === 'not_submitted').length;
  const validRated = submitted.filter(r => ratingLabels.includes(r.rating || ''));
  const missingRating = submitted.filter(r => !r.rating?.trim()).length;
  const unrecognisedRating = submitted.filter(r => r.rating?.trim() && !ratingLabels.includes(r.rating)).length;
  const missingReviewer = submitted.filter(r => !r.reviewer_name?.trim()).length;
  const incomplete = submitted.filter(r => !ratingLabels.includes(r.rating || '') || !r.reviewer_name?.trim()).length;
  const departments = [...new Set(rows.map(r => r.staff.department?.trim() || 'Unassigned'))].map(name => {
    const group = rows.filter(r => (r.staff.department?.trim() || 'Unassigned') === name);
    const complete = group.filter(isSubmitted).length;
    return { name, total: group.length, complete, outstanding: group.length - complete, overdue: group.filter(r => r.derived_status === 'overdue').length, rate: percent(complete, group.length) };
  }).sort((a,b) => b.overdue - a.overdue || (a.rate || 0) - (b.rate || 0) || a.name.localeCompare(b.name));
  return { total: rows.length, completed: submitted.length, onTime, late, overdue, pending, outstanding: rows.length - submitted.length,
    completionRate: percent(submitted.length, rows.length), onTimeRate: percent(onTime, submitted.length),
    rated: validRated.length, missingRating, unrecognisedRating, missingReviewer, incomplete, departments,
    ratings: ratingLabels.map(name => ({ name, count: validRated.filter(r => r.rating === name).length, share: percent(validRated.filter(r => r.rating === name).length, validRated.length) })) };
}
export function executiveSummary(name: string, s: ReturnType<typeof summarise>) {
  if (!s.total) return `${name}: no appraisal records are available. Confirm the cycle population before drawing conclusions.`;
  return `${name}: ${s.completed} of ${s.total} appraisals received (${displayPercent(s.completionRate)}). ${s.outstanding} outstanding: ${s.overdue} overdue and ${s.pending} awaiting submission before the deadline. ${s.onTime} of ${s.completed} received on time (${displayPercent(s.onTimeRate)}); ${s.late} received late. ${s.incomplete} submitted records require rating or reviewer checks. ${s.outstanding ? 'HR and department heads should agree follow-up dates for outstanding submissions.' : 'All recorded appraisals have been received.'} ${s.rated} submitted appraisals have recognised ratings; this distribution is provisional and does not establish a trend or determine reward decisions.`;
}
