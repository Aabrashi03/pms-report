import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInvitationEmail, invitationEmailSubject } from '../lib/invitation-email.ts';

test('account invitation explains the Supabase confirmation step',()=>{
  const message=buildInvitationEmail('MUHAMMAD BAKHTIAR BIN MAHIDDIN','https://pms-report-coral.vercel.app/login');
  assert.match(invitationEmailSubject,/Invitation to SPSB Performance & Development Review/);
  assert.match(message,/Dear MUHAMMAD BAKHTIAR BIN MAHIDDIN,/);
  assert.match(message,/confirmation email sent by Supabase/);
  assert.match(message,/Junk or Spam folder/);
  assert.match(message,/click the Confirm your email link/);
  assert.match(message,/newly created password/);
});
