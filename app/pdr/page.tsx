"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PdrForm } from "@/components/pdr-form";
import { getActiveCycleDashboard, type DashboardRow, type StaffRecord } from "@/lib/data/client";

const previewStaff: StaffRecord = { id:"preview", employee_id:"", full_name:"Employee name", email:null, position:"Position", department:"Division / Department", manager_email:"reviewing.manager@selangorproperties.com.my", hod_name:"Head of Department", head_of_division:"Head of Division", is_manager:false, is_confirmation_staff:true };

export default function PdrPage() {
  const [rows,setRows]=useState<DashboardRow[]>([]); const [cycle,setCycle]=useState("2026 Year-End Performance and Development Review"); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{getActiveCycleDashboard().then(result=>{setRows(result.rows);if(result.cycle?.name&&result.rows.length)setCycle(result.cycle.name);}).catch(e=>setError(e instanceof Error?e.message:"Could not load the PDR form.")).finally(()=>setLoading(false));},[]);
  return <AppShell title="Performance and Development Review" subtitle="SPSB year-end appraisal form">
    {loading?<div className="state-card" role="status">Loading PDR form…</div>:<>
      {error&&<p className="pdr-message">{error} A complete form preview is shown below.</p>}
      {!rows.length&&<p className="pdr-message">Form preview. HR must create and activate the 2026 cycle to assign a saveable copy to each employee.</p>}
      <PdrForm row={rows[0]} cycleName={cycle} previewStaff={previewStaff}/>
    </>}
  </AppShell>;
}
