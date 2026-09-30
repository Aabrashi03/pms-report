"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionForm } from "@/components/submission-form";
import { getActiveCycleDashboard, type DashboardRow } from "@/lib/data/client";

export default function DashboardPage() {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [cycle, setCycle] = useState<{ id: string; name: string; due_date: string } | null>(null);
  const [selected, setSelected] = useState<DashboardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getActiveCycleDashboard();
      setRows(result.rows);
      setCycle(result.cycle);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  const completed = rows.filter((row) => ["submitted", "late"].includes(row.derived_status)).length;
  const percentage = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  const overdue = rows.filter((row) => row.derived_status === "overdue").length;
  const onTime = rows.filter((row) => row.derived_status === "submitted").length;
  const onTimeRate = completed ? Math.round((onTime / completed) * 100) : 0;
  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.staff.full_name.localeCompare(b.staff.full_name)), [rows]);

  return (
    <AppShell title="Dashboard" subtitle={cycle ? `${cycle.name} · Due ${formatDate(cycle.due_date)}` : "Current appraisal cycle"}>
      {loading ? <DashboardSkeleton /> : error ? (
        <div className="state-card error-state"><h2>We couldn’t load submissions</h2><p>{error}</p><button className="button" onClick={load}>Try again</button></div>
      ) : !cycle ? (
        <div className="state-card"><h2>No active appraisal cycle</h2><p>Create or activate a cycle to start tracking submissions.</p><Link className="button" href="/cycles">Create a cycle</Link></div>
      ) : rows.length === 0 ? (
        <div className="state-card"><h2>No staff yet</h2><p>Add staff to begin.</p><Link className="button" href="/staff">Add staff</Link></div>
      ) : (
        <>
          <section className="metric-grid" aria-label="Cycle summary">
            <div className="metric-card metric-primary"><span>Completed</span><strong>{completed} of {rows.length}</strong><small>{percentage}% complete</small></div>
            <div className="metric-card"><span>On-time rate</span><strong>{onTimeRate}%</strong><small>{onTime} on-time submissions</small></div>
            <div className="metric-card"><span>Needs attention</span><strong>{overdue}</strong><small>Overdue submissions</small></div>
          </section>
          <section className="progress-panel" aria-label={`${completed} of ${rows.length} submitted`}>
            <div className="progress-copy"><strong>Cycle progress</strong><span>{completed} of {rows.length} submitted</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
          </section>
          <section className="table-card">
            <div className="section-heading"><div><p className="eyebrow">Submission tracker</p><h2>All staff</h2></div><Link href="/staff" className="text-link">Manage staff →</Link></div>
            <div className="table-wrap">
              <table><thead><tr><th>Staff member</th><th>Department</th><th>Status</th><th>Submitted</th><th>Rating</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>{sortedRows.map((row) => <tr key={row.staff.id}>
                  <td><button className="person-button" onClick={() => setSelected(row)}><span className="avatar">{initials(row.staff.full_name)}</span><span><strong>{row.staff.full_name}</strong><small>{row.staff.position || row.staff.employee_id}</small></span></button></td>
                  <td>{row.staff.department || "—"}</td><td><StatusBadge status={row.derived_status} /></td>
                  <td>{row.submission_date ? formatDate(row.submission_date) : "—"}</td><td>{row.rating || "—"}</td>
                  <td><button className="row-action" onClick={() => setSelected(row)}>Update</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {selected && cycle && <SubmissionForm row={selected} cycle={cycle} onClose={() => setSelected(null)} onSaved={async () => { setSelected(null); await load(); }} />}
    </AppShell>
  );
}

function DashboardSkeleton() {
  return <div aria-label="Loading dashboard" role="status"><div className="metric-grid">{[1,2,3].map((item) => <div className="metric-card skeleton" key={item} />)}</div><div className="table-card skeleton-table"><span className="spinner" /> Loading submissions…</div></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function initials(value: string) { return value.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
