import { createClient as createResetClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { companyResetEmail } from '@/lib/password-reset';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });

  const { data: membership, error: membershipError } = await db
    .from('team_members')
    .select('team_id,role')
    .eq('user_id', user.id)
    .single();
  if (membershipError || !membership || !['owner', 'editor'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only HR administrators can send password-reset emails.' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'A valid staff email is required.' }, { status: 400 }); }
  const email = companyResetEmail((body as { email?: unknown })?.email);
  if (!email) return NextResponse.json({ error: 'Use a valid SPSB email address.' }, { status: 400 });
  const { data: staff, error: staffError } = await db.from('staff').select('id,account_activated_at').eq('team_id',membership.team_id).ilike('email',email).single();
  if (staffError || !staff) return NextResponse.json({ error: 'This email is not in the HR staff list.' }, { status: 404 });
  if (!staff.account_activated_at) return NextResponse.json({ error: 'This employee does not have an active account yet. Send an invitation first.' }, { status: 409 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'Password reset is not configured.' }, { status: 503 });

  const resetClient = createResetClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await resetClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${request.nextUrl.origin}/auth/callback?next=/reset-password`,
  });
  if (error) return NextResponse.json({ error: 'The reset email could not be sent. Please try again later.' }, { status: 502 });

  await db.from('audit_log').insert({
    team_id: membership.team_id,
    actor_id: user.id,
    action: 'password_reset_requested',
    target_type: 'staff_account',
    details: { email },
  });
  return NextResponse.json({ ok: true });
}
