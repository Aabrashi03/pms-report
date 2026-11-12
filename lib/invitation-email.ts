export const invitationEmailSubject='Invitation to SPSB Performance & Development Review (PDR) Portal';

export function buildInvitationEmail(employeeName:string,portalUrl:string){
  return [
    `Dear ${employeeName},`,
    '',
    'You have been invited to access the SPSB Performance & Development Review (PDR) Portal.',
    '',
    `Portal link: ${portalUrl}`,
    '',
    'First-time user instructions:',
    '1. Open the portal and click Create an account.',
    '2. Register using your SPSB email address.',
    '3. Create your PDR portal password.',
    '4. Check your email inbox for the confirmation email sent by Supabase. Please also check your Junk or Spam folder.',
    '5. Open the confirmation email and click the Confirm your email link.',
    '6. Return to the PDR Portal and sign in using your SPSB email address and newly created password.',
    '',
    'If you already have an account, you may sign in directly using your SPSB email address and PDR portal password.',
    '',
    'If you do not receive the confirmation email or require assistance, please contact Human Resource & Administration.',
    '',
    'Thank you.',
    '',
    'Human Resource & Administration',
    'Selangor Properties Sdn Bhd',
  ].join('\n');
}
