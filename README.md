# Change Chartered Accountants — Task Tracker

A web app that tracks client tasks and deadlines for the organization's team. Arabic interface (right-to-left).

**Stack:** Next.js 16 (App Router, Server Actions) · PostgreSQL (plain SQL via `pg`) · Tailwind CSS 4 · Nodemailer.

## MVP features (v1)

- **Team accounts:** first-run setup creates the organization and its admin. The admin adds team members, and each one gets an invitation link to set a password. Password reset by email. In v1 every member has the same access to tasks; the admin also manages the team and settings.
- **Clients:** add, edit, archive, delete and search clients. Each client shows open, overdue and completed counts.
- **Client import** from Excel (`.xlsx`) or CSV. Arabic and English column names are detected automatically, you can adjust the mapping, a preview is shown, and duplicate names are skipped.
- **Tasks:** each task belongs to one client and has a title, a deadline (date only), a priority, a status, a description and an optional per-task reminder. You can add several tasks for the same client in a row, and duplicate or delete tasks.
- **Tracking:** statuses are not started, in progress, on hold, done and cancelled. One click marks a task done. A task past its deadline is flagged overdue automatically. Each task records who created and last edited it, and when it was completed.
- **Dashboard:** counts of overdue tasks, tasks due today, tasks due in the next 7 days, and tasks completed this week, plus a "needs attention" list. Colour coding: red means overdue, amber means due within 2 days, green means done.
- **Task list:** search, filter by client, status, deadline window or priority, and sort. Filters are kept in the URL, so a filtered view can be bookmarked.
- **Reminders:**
  - The default reminder fires **2 days before** the deadline. Admins can change the default, and any task can override it.
  - A reminder also fires on the deadline day.
  - An overdue reminder repeats **daily** until the task is done or cancelled.
  - Reminders appear in-app (notification bell) and in a **daily digest email** that lists overdue tasks, tasks due today, reminders and tasks due this week. Each user can turn the email off.
  - Closing a task stops its reminders.

See the requirements document for Phase 2 (recurring tasks, subtasks, templates, comments, calendar, reports/export) and Phase 3 (roles Admin / Assignee / Follower, assignment, review workflow).

## Run it on your laptop

Requirements: **Node.js 20+** and **PostgreSQL 13+**.

```bash
git clone https://github.com/rodainaelsawy/Change-Chartered-Accountants-Task-Tracker.git
cd Change-Chartered-Accountants-Task-Tracker
npm install

# 1. Create an empty database (or use pgAdmin → Create → Database "task_tracker")
createdb -U postgres task_tracker

# 2. Configure
cp .env.example .env          # Windows: copy .env.example .env
#    then edit DATABASE_URL in .env with your Postgres user/password

# 3. Create the tables
npm run db:migrate

# 4. Start
npm run dev
```

Open http://localhost:3000. The first visit shows the **first-run setup**, where you create the organization and the admin account.

Without SMTP settings, emails (invitations, password resets, the daily digest) are **printed in the terminal** running `npm run dev`. This is convenient for development. Invitation links are also shown on screen to the admin.

## Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | `true` for hosted databases that require SSL |
| `APP_URL` | Public URL of the app, used in email links |
| `CRON_SECRET` | Secret for the reminders endpoint |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email. For Gmail use `smtp.gmail.com`, port `587`, and an **App Password** |

## How reminders run

Reminders are generated once per day per organization:

1. **Automatically**, on the first page load of the day by any user. No setup is needed.
2. **On a schedule** (recommended in production, so the morning email goes out even if nobody opens the app): call
   `GET {APP_URL}/api/cron/reminders?key={CRON_SECRET}` every morning, e.g. 07:00. Options:
   - Linux/macOS cron: `0 7 * * * cd /path/to/app && npm run reminders`
   - Windows Task Scheduler: run `npm run reminders` daily.
   - Vercel: add a Cron Job for `/api/cron/reminders` and send the secret as `Authorization: Bearer …`.

Add `&force=1` to send today's digest again (useful when testing email settings).

## Production

The app is a standard Next.js server: `npm run build && npm start`. Point `DATABASE_URL` at a Postgres the server can reach, for example the client's server, Supabase, Neon or Railway. A laptop database is for development only. Run `npm run db:migrate` against the production database when deploying a new version.

## Project structure

```
app/
  (auth)/           login, first-run setup, forgot/reset password (also used for invitations)
  (app)/            signed-in pages: dashboard, tasks, clients, import, notifications, settings
  actions/          server actions (every one checks the session and the organization)
  api/cron/         daily reminders endpoint
components/         shared UI (task list, forms, badges)
lib/                db pool, auth/sessions, dates, reminders, email, queries
db/migrations/      SQL migrations, applied in order by `npm run db:migrate`
scripts/            migrate + reminders CLI
```
