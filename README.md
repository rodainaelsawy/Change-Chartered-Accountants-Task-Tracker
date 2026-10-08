# Change Chartered Accountants — Task Tracker

A web app that tracks the tasks and deadlines of the companies the office serves for the organization's team. Arabic interface (right-to-left).

**Stack:** Next.js 16 (App Router, Server Actions) · PostgreSQL (plain SQL via `pg`) · Tailwind CSS 4 · Nodemailer.

## MVP features (v1)

- **Team accounts:** first-run setup creates the organization and its admin. The admin adds team members, and each one gets an invitation link to set a password. Password reset by email. In v1 every member has the same access to tasks; the admin also manages the team and settings.
- **Companies (الشركات):** add, edit, archive, delete and search companies. Each company shows open, overdue and completed counts.
  - **General data tab (البيانات العامة):** activity, contact person, phone, email, notes.
  - **Tax data tab (البيانات الضريبية):** the tax-portal email, username and password. The password is stored **encrypted** (AES-256-GCM) and loaded only when someone clicks "show" or "copy".
  - **Attachments (المرفقات), PDF only, max 10 MB each:** السجل التجاري (one file, a new upload replaces it), البطاقة الضريبية (one file, replaced the same way), and أخرى (any number of files). Files open only for signed-in users of the organization.
- **Company import** from Excel (`.xlsx`) or CSV, including the tax data; attachments are added per company. Arabic and English column names are detected automatically, you can adjust the mapping, a preview is shown (passwords are masked), and duplicate names are skipped.
- **Tasks:** each task belongs to one company and has a title, a deadline (date only), a priority, a status, a description and an optional per-task reminder. You can add several tasks for the same company in a row, and duplicate or delete tasks.
- **Assignees (المسؤولون):** every task has one or more responsible team members (mandatory). Only they get its reminders and daily digest; new assignees get a notification. "مهامي" filters on the dashboard and task list.
- **Recurring tasks:** weekly, monthly, every 3 months or yearly. The first deadline is picked in the calendar; the next task is created automatically when the current one is done or its deadline arrives (whichever is first), with the same company, assignees and steps. Months without that day use the last day of the month. Recurrence can be stopped from the task page.
- **Steps (checklist), comments and history:** tick off steps with a progress bar; team comments (edit your own); an automatic history of every change on each task.
- **Templates and bulk add:** save a set of tasks once (each with "days after start", priority, recurrence, steps) and apply it to one or many companies with a start date and assignees; or add several tasks for one company in one form.
- **Calendar:** month view of deadlines (weeks start on Saturday), mine/all, by company; a day-by-day list on phones.
- **Reports:** per company for any period: total, done on time, done late, open, overdue now, and on-time rate; plus the tasks completed in the period. Export to **Excel** (right-to-left sheets) or **print / save as PDF**. The task list can be exported to Excel with its current filters.
- **Tracking:** statuses are not started, in progress, on hold, done and cancelled. One click marks a task done. A task past its deadline is flagged overdue automatically. Each task records who created and last edited it, and when it was completed.
- **Dashboard:** counts of overdue tasks, tasks due today, tasks due in the next 7 days, and tasks completed this week, plus a "needs attention" list. Colour coding: red means overdue, amber means due within 2 days, green means done.
- **Task list:** search, filter by company, status, deadline window or priority, and sort. Filters are kept in the URL, so a filtered view can be bookmarked.
- **Reminders:**
  - The default reminder fires **2 days before** the deadline. Admins can change the default, and any task can override it.
  - A reminder also fires on the deadline day.
  - An overdue reminder repeats **daily** until the task is done or cancelled.
  - Reminders appear in-app (notification bell) and in a **daily digest email** that lists overdue tasks, tasks due today, reminders and tasks due this week. Each user can turn the email off.
  - Closing a task stops its reminders.

See the requirements document for Phase 2 (recurring tasks, subtasks, templates, comments, calendar, reports/export) and Phase 3 (roles Admin / Assignee / Follower, assignment, review workflow).

## Run it on your laptop

Requirements: **Node.js 20+** and **PostgreSQL 13+**.

```bat
git clone https://github.com/rodainaelsawy/Change-Chartered-Accountants-Task-Tracker.git
cd Change-Chartered-Accountants-Task-Tracker
npm install

:: 1. Create the settings file (macOS/Linux: cp .env.example .env)
copy .env.example .env
notepad .env
::    put your Postgres password in DATABASE_URL, save, close

:: 2. Create the database and tables (the database is created automatically if missing)
npm run db:migrate

:: 3. Start
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
| `ENCRYPTION_KEY` | Encrypts the tax-portal passwords. Generate once: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Never change it** once real data exists. Optional in development (an insecure dev key is used), required in production |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store for PDF attachments. Set automatically on Vercel when you connect a **private** Blob store. Leave empty locally: files go to the `.uploads/` folder |
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

The app is a standard Next.js server: `npm run build && npm start`. Point `DATABASE_URL` at a Postgres the server can reach, for example your own server, Supabase, Neon or Railway. A laptop database is for development only. Run `npm run db:migrate` against the production database when deploying a new version.

## Project structure

```
app/
  (auth)/           login, first-run setup, forgot/reset password (also used for invitations)
  (app)/            signed-in pages: dashboard, tasks, companies, import, notifications, settings
  actions/          server actions (every one checks the session and the organization)
  api/cron/         daily reminders endpoint
components/         shared UI (task list, forms, badges)
lib/                db pool, auth/sessions, dates, reminders, email, queries
db/migrations/      SQL migrations, applied in order by `npm run db:migrate`
scripts/            migrate + reminders CLI
```
