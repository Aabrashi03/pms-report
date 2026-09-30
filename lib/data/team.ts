import { createClient } from "@/lib/supabase/client";

export const teamsEnabled = process.env.NEXT_PUBLIC_TEAM_WORKSPACES_ENABLED === "true";
export type CompanyAccess = { teamId: string; role: 'owner' | 'editor' | 'viewer' | 'manager'; departments: string[] };
export async function getCompanyAccess(): Promise<CompanyAccess | null> {
  if (!teamsEnabled) return null;
  const db = createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new Error('Sign in on the Team access page to view company records.');
  const { data, error } = await db.from('team_members').select('team_id,role,departments').eq('user_id',user.id).single();
  if (error || !data) throw new Error('Ask your administrator to grant company access.');
  return { teamId: data.team_id, role: data.role, departments: data.departments || [] };
}
export async function requireCompanyEditor() {
  const access = await getCompanyAccess();
  if (access && !['owner','editor'].includes(access.role)) throw new Error('Your access is read-only. Ask HR to update company records.');
  return access?.teamId || null;
}
export async function requireTeamId(): Promise<string | null> {
  return (await getCompanyAccess())?.teamId || null;
}
