# Project notes for Claude Code

Task & deadline tracker for an accounting office. Arabic-only UI, RTL (`<html lang="ar" dir="rtl">`).

## Stack and conventions
- **Next.js 16** App Router. APIs differ from older versions: read `node_modules/next/dist/docs/` before using a Next API you are unsure about. `params` / `searchParams` / `cookies()` are async. Cache Components are **not** enabled; pages that read the DB are dynamic.
- **Database:** plain PostgreSQL through `pg` (`lib/db.ts`: `query`, `one`, `tx`). No ORM.
  - Schema changes = a **new** numbered file in `db/migrations/` (e.g. `002_recurring_tasks.sql`), applied with `npm run db:migrate`. Never edit a migration that has been applied.
  - DATE columns come back as `'YYYY-MM-DD'` strings (type parser in `lib/db.ts`). Deadlines are dates only; "today" = `todayIn(org.timezone)` from `lib/dates.ts`.
- **Auth:** own sessions (`sessions` table, httpOnly cookie) in `lib/auth.ts`. Every server action and page must call `requireSession()` / `requireAdmin()` and scope every query by `org_id`.
- **Mutations:** server actions in `app/actions/*.ts`. Forms that show errors use `components/action-form.tsx` (actions return `{ error } | { ok }` or `redirect`).
- **Naming:** the office's customers are **companies** (Arabic: شركة / الشركات, feminine agreement: "هذه الشركة", "مؤرشفة"). Never reintroduce "client"/"عميل". Table `companies`, `tasks.company_id`, routes `/companies`.
- **Tax data:** `companies.tax_email`, `tax_username`, `tax_password_enc`. Encrypt/decrypt only via `lib/crypto.ts` (`ENCRYPTION_KEY`). Never send the decrypted password in page HTML; use the `revealTaxPassword` server action.
- **Attachments:** `company_attachments` (kinds `commercial_register`, `tax_card` = one file each, replaced on upload; `other` = many). PDF only, ≤ 10 MB. Storage in `lib/storage.ts`: Vercel Blob (private) when `BLOB_READ_WRITE_TOKEN` is set, else `.uploads/`. Uploads: `/api/attachments/upload` (Blob: client token + `confirmBlobUpload`; local: multipart). Downloads only via `/api/attachments/[id]` (session + org check). Deleting a company must delete its files (`deleteCompanyFiles`).
- **Reminders:** `lib/reminders.ts`. `syncNotifications` is idempotent; call it after any task change. `runDaily` runs once per org per day (layout + `/api/cron/reminders`).
- UI strings are Arabic; status/priority labels live in `lib/labels.ts`. Use Tailwind; shared classes in `components/ui.tsx`. Use `ms-`/`me-` (logical) spacing where direction matters.

## Checks
- `npx tsc --noEmit` and `npm run build` must pass.
- Manual test: `npm run dev`, first-run setup at `/setup`, emails print to the terminal when `SMTP_HOST` is empty.

## Roadmap (from the agreed requirements)
- Phase 2: recurring tasks, subtasks/checklists, bulk add + task templates, comments, activity history, calendar view, per-company reports, Excel/PDF export.
- Phase 3: roles Admin / Assignee / Follower, task assignment (reminders go to the assignee), "My tasks" + workload, review workflow (Assignee → Ready for review → Follower approves to Done or returns to In progress with a comment), Kanban, saved filters.
