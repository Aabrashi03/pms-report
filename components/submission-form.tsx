"use client";

import { useState } from "react";
import { saveSubmission, type DashboardRow } from "@/lib/data/client";
import { RATINGS } from "@/lib/data/types";
import { StatusBadge } from "./status-badge";

export function SubmissionForm({ row, cycle, onClose, onSaved }: { row: DashboardRow; cycle: { id: string; name: string; due_date: string }; onClose: () => void; onSaved: () => Promise<void> }) {
  const [date, setDate] = useState(row.submission_date || "");
  const [rating, setRating] = useState(row.rating || "");
  const [reviewer, setReviewer] = useState(row.reviewer_name || "");
  const [comments, setComments] = useState(row.comments || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (date && Number.isNaN(Date.parse(`${date}T00:00:00`))) return setError("Please enter a valid date.");
    setSaving(true);
    try { await saveSubmission({ id: row.id, cycleId: cycle.id, staffId: row.staff.id, dueDate: cycle.due_date, submissionDate: date || null, rating: rating || null, reviewerName: reviewer || null, comments: comments || null }); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Please retry."); setSaving(false); }
  }
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="submission-title"><button className="modal-dismiss" aria-label="Close" onClick={onClose} /><section className="drawer">
    <div className="drawer-header"><div><p className="eyebrow">Update submission</p><h2 id="submission-title">{row.staff.full_name}</h2><p>{row.staff.employee_id} · {row.staff.department}</p></div><button className="icon-button" onClick={onClose} aria-label="Close form">×</button></div>
    <div className="current-status"><span>Current status</span><StatusBadge status={row.derived_status} /></div>
    <form onSubmit={submit} className="form-stack"><label>Submission date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} max="2100-12-31" /><small>Due {cycle.due_date}. Status is calculated automatically.</small></label>
      <label>Performance rating<select value={rating} onChange={(e) => setRating(e.target.value)}><option value="">Select a rating</option>{RATINGS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Reviewer<input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="e.g. Jane Director" /></label>
      <label>Comments<textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={5} placeholder="Add context for the management report…" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={saving}>{saving ? "Saving…" : "Save submission"}</button></div>
    </form>
  </section></div>;
}
