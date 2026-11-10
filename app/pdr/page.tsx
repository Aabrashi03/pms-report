"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PdrForm } from "@/components/pdr-form";
import { getActiveCycleDashboard, type DashboardRow, type StaffRecord } from "@/lib/data/client";
import { getCompanyAccess, type CompanyAccess } from "@/lib/data/team";
import { createClient } from "@/lib/supabase/client";

const previewStaff: StaffRecord = { id:"preview", employee_id:"", full_name:"Employee name", email:null, position:"Position", department:"Division / Department", manager_email:"reviewing.manager@selangorproperties.com.my", hod_name:"Head of Department", head_of_division:"Head of Division", is_manager:false, is_confirmation_staff:true };

export default function PdrPage() {
  const [requested,setRequested]=useState<string|null>(null);
  const [rows,setRows]=useState<DashboardRow[]>([]); const [cycle,setCycle]=useState("2026 Year-End Performance and Development Review"); const [access,setAccess]=useState<CompanyAccess|null>(null); const [userEmail,setUserEmail]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{setRequested(new URLSearchParams(window.location.search).get("submission"));Promise.all([getActiveCycleDashboard(),getCompanyAccess(),createClient().auth.getUser()]).then(([result,companyAccess,authResult])=>{setRows(result.rows);setAccess(companyAccess);setUserEmail(authResult.data.user?.email?.toLowerCase()||"");if(result.cycle?.name&&result.rows.length)setCycle(result.cycle.name);}).catch(e=>setError(e instanceof Error?e.message:"Could not load the PDR form.")).finally(()=>setLoading(false));},[]);
  const selected=requested?rows.find(row=>row.id===requested):rows.find(row=>row.staff.email?.toLowerCase()===userEmail)||(access?.role==="employee"?rows[0]:undefined);
  return <AppShell title="Performance and Development Review" subtitle="SPSB year-end appraisal form">
    {loading?<div className="state-card" role="status">Loading PDR form…</div>:<>
      {error&&<p className="pdr-message">{error} A complete form preview is shown below.</p>}
      {!rows.length&&<p className="pdr-message">Form preview. HR must create and activate the 2026 cycle to assign a saveable copy to each employee.</p>}
      {rows.length>0&&!selected&&<p className="pdr-message">Your email is not matched to an employee record. Open an employee from the dashboard, or update the employee email in Staff.</p>}
      <PdrForm row={selected} cycleName={cycle} previewStaff={previewStaff} accessRole={access?.role}/>
    </>}
  </AppShell>;
}
