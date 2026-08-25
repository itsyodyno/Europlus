# EUROPLUS Work Command

Private operations panel for Redberry and EUROPLUS. It coordinates inquiries,
PI approvals, confirmed orders, supplier payments, local expenses, production
follow-up, activity history, and the handoff to the separate Container Tracker.

## Access model

- Jimmy — Director; full panel and Accounts ledger access.
- Hemansh — Administrator; full panel and Accounts ledger access.
- Max — Inquiry lead; operational sections, no Accounts ledger.
- Laura — Operations coordinator; operational sections, no Accounts ledger.
- Apex — Inquiry assistant; operational sections, no Accounts ledger.

Factory PIs, invoices, payment proofs, production photographs, and order files
are shared with the full authenticated team. Only `accounts_ledger` is private
to Jimmy and Hemansh. This restriction is enforced by Supabase Row Level
Security as well as the interface.

## Supabase setup

1. Open the Supabase project and go to **SQL Editor**.
2. Run [`supabase/schema.sql`](supabase/schema.sql).
3. Go to **Authentication → Users** and create the five login users.
4. At the bottom of `supabase/schema.sql`, replace the sample emails and run the
   five role-assignment statements.
5. Copy `.env.example` to `.env.local`.
6. In **Project Settings → API**, copy the Project URL and Publishable key into
   `.env.local`.

Never place the Supabase `service_role` key in this project. The publishable key
is the correct browser key because the database and file policies enforce user
permissions.

## Local development

This project uses Node.js 22 and pnpm.

```bash
pnpm install
pnpm dev
```

Build the deployable version with:

```bash
pnpm build
```

## GitHub

The repository is ready to remain private on GitHub. Commit the source,
`pnpm-lock.yaml`, `.env.example`, and `supabase/schema.sql`. Never commit
`.env.local` or any Supabase secret.

The live site is hosted separately from GitHub. GitHub stores the code and
change history; Supabase stores users, records, and private order files.

