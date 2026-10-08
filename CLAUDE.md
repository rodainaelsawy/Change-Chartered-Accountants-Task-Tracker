# Project notes for Claude Code

Task & deadline tracker for an accounting office. Arabic-only UI, RTL (`<html lang="ar" dir="rtl">`).

## Stack and conventions
- **Next.js 16** App Router. APIs differ from older versions: read `node_modules/next/dist/docs/` before using a Next API you are unsure about. `params` / `searchParams` / `cookies()` are async. Cache Components are **not** enabled; pages that read the DB are dynamic.
- **Database:** plain PostgreSQL through `pg` (`lib/db.ts`: `query`, `one`, `tx`). No ORM.
  - Schema changes = a **new** numbered file in `db/migrations/` (e.g. `002_recurring_tasks.sql`), applied with `npm run db:migrate`. Never edit a migration that has been applied.
  - DATE columns come back as `'YYYY-MM-DD'` strings (type parser in `lib/db.ts`). Deadlines are dates only; "today" = `todayIn(org.timezone)` from `lib/dates.ts`.
- **Auth:** own sessions (`sessions` table, httpOnly cookie) in `lib/auth.ts`. Every server action and page must call `requireSession()` / `requireAdmin()` and scope every query by `org_id`.
- **Mutations:** server actions in `app/actions/*.ts`. Forms that show errors use `components/action-form.tsx` (actions return `{ error } | { ok }` or `redirect`).
- **Reminders:** `lib/reminders.ts`. `syncNotifications` is idempotent; call it after any task change. `runDaily` runs once per org per day (layout + `/api/cron/reminders`).
- UI strings are Arabic; status/priority labels live in `lib/labels.ts`. Use Tailwind; shared classes in `components/ui.tsx`. Use `ms-`/`me-` (logical) spacing where direction matters.

## Checks
- `npx tsc --noEmit` and `npm run build` must pass.
- Manual test: `npm run dev`, first-run setup at `/setup`, emails print to the terminal when `SMTP_HOST` is empty.

## Roadmap (from the agreed requirements)
- Phase 2: recurring tasks, subtasks/checklists, bulk add + task templates, comments, activity history, calendar view, per-client reports, Excel/PDF export.
- Phase 3: roles Admin / Assignee / Follower, task assignment (reminders go to the assignee), "My tasks" + workload, review workflow (Assignee → Ready for review → Follower approves to Done or returns to In progress with a comment), Kanban, saved filters.
