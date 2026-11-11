# Microsoft 365 PDR notification setup

The PDR portal is ready to send workflow notifications through the SPSB Microsoft 365 tenant. Sign-in remains on Supabase; Microsoft 365 is used only to deliver workflow email.

## Required SPSB IT actions

1. Confirm that `hrdept@selangorproperties.com.my` is a mailbox that may send email.
2. Register a confidential application in Microsoft Entra ID for the PDR portal.
3. Grant Microsoft Graph application permission `Mail.Send` and provide administrator consent.
4. Restrict the application so it can send only as `hrdept@selangorproperties.com.my`.
5. Create a client credential following SPSB security policy. A certificate or federated credential is preferable where supported; a client secret may be used if IT manages its expiry and rotation.
6. Add the following server-side environment variables directly in Vercel. Do not send credential values through email or chat.

```ini
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_SENDER_EMAIL=hrdept@selangorproperties.com.my
HR_NOTIFICATION_EMAIL=maznah.bahudin@selangorproperties.com.my
NEXT_PUBLIC_APP_URL=https://pms-report-coral.vercel.app
```

`HR_NOTIFICATION_EMAIL` accepts multiple comma-separated SPSB addresses if another HR recipient is required.

## Notification route

- Employee submits → assigned N+1 manager.
- N+1 submits → assigned N+2 approver, when applicable.
- N+1 submits with no N+2 → HR.
- N+2 submits → HR.
- Reviewer returns a PDR → the employee or prior reviewer who must correct it.
- Completion → HR, employee and N+1 manager receive the completion notice.

Emails contain the employee name, required action and secure portal link only. Ratings, correction comments and other PDR details remain inside the authenticated portal.

## Acceptance test

Use a test employee and confirm each message is delivered from `hrdept@selangorproperties.com.my`, contains the correct portal link and reaches only the assigned recipient. Complete separate tests for one N+1 route and one N+2 route before production use.

Microsoft references:

- https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- https://learn.microsoft.com/en-us/graph/permissions-reference
