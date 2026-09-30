# Company and department access rollout

The app implements one company workspace. Administrator and HR editor can maintain company data; management viewers can read all departments; department managers can read and export only assigned departments. Manager access is enforced by database row-level security, including direct API requests. A hidden menu is not the security boundary.

## Activation requirements

The live app remains in its existing demo mode until the following steps are complete. Do not describe department isolation as active before verifying them.

1. Back up the existing database. Confirm the first three migrations are applied.
2. Confirm the initial administrator has an email-verified Supabase Auth account. The user supplied this address in the chat; do not automatically grant access to the first person who registers.
3. In an authorized database session, set `pms.admin_email` to that verified address, then execute `supabase/migrations/0004_team_workspaces.sql` in the same session. The migration validates the account before making changes. It creates one company and backfills all existing records into it in one transaction. Missing verification rolls back the migration. It removes the old public read/write policies; anonymous access ends when the transaction commits.
4. Set `NEXT_PUBLIC_TEAM_WORKSPACES_ENABLED=true` in the deployment environment and rebuild. Arrange the deployment and database cutover together: between the migration and deployment, the old demo cannot read the secured data.
5. Sign in at `/team` as the administrator. Other colleagues register and verify their email; only the administrator can grant roles and existing department names. No access is granted by registration alone.
6. Complete the tests below against the actual database before admitting staff data or claiming access isolation.

The flag is only a UI rollout switch. Never reverse access restrictions by restoring public policies. Rolling back the UI must preserve database protection.

## Required access tests

- Anonymous users and a verified account with no membership cannot read or alter staff, submissions, cycles, membership or audit data through the API.
- A manager assigned to Finance can read only Finance staff and submissions, including nested queries, individual IDs and reports/Excel export. A manager cannot read HR or Sales records even by supplying their IDs.
- Managers and viewers cannot create, edit or delete staff/cycles/submissions or grant/remove memberships. Direct API attempts must be denied, not merely hidden in the UI.
- An HR editor can maintain all company records but cannot change memberships. Management viewers can read all company reports without changing data.
- An administrator can grant/revoke department access for a verified account; unverified emails, empty/unknown departments, invalid roles and attempts to replace the administrator are rejected.
- Revocation immediately removes data access; an old browser tab and session cannot continue reading through the API.
- New records inherit the company ID through the app; mismatched staff and cycle company references fail their foreign keys.
- Existing record counts and submission data are unchanged after migration. Confirm the original administrator can read every existing record.

Local compilation and report unit tests do not prove these database rules. This repository does not include an administrative connection; migration execution and live role tests require authorized Supabase access.
