-- Phase 2a: assignees, recurring tasks, checklists, comments, activity history.

-- ---------- Assignees (one or more per task; reminders go to them) ----------
create table task_assignees (
  task_id  uuid not null references tasks(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  primary key (task_id, user_id)
);
create index on task_assignees(user_id);

-- Existing tasks: assign them to the person who created them (or to the admins if unknown).
insert into task_assignees (task_id, user_id)
select t.id, t.created_by from tasks t where t.created_by is not null
on conflict do nothing;
insert into task_assignees (task_id, user_id)
select t.id, u.id from tasks t join users u on u.org_id = t.org_id and u.role = 'admin'
 where not exists (select 1 from task_assignees a where a.task_id = t.id)
on conflict do nothing;

alter type notif_kind add value if not exists 'assigned';

-- ---------- Recurring tasks ----------
-- A series remembers the frequency and the first deadline (anchor). Occurrence n has deadline
-- anchor + n periods (clamped to the month's last day). The next occurrence is created as soon as
-- the latest one is done/cancelled or its deadline arrives, whichever comes first.
create type recurrence_freq as enum ('weekly', 'monthly', 'quarterly', 'yearly');

create table task_series (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  frequency    recurrence_freq not null,
  anchor_date  date not null,
  active       boolean not null default true,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table tasks
  add column series_id     uuid references task_series(id) on delete set null,
  add column occurrence_no int;
create unique index tasks_series_occurrence on tasks(series_id, occurrence_no) where series_id is not null;

-- ---------- Checklist (subtasks) ----------
create table task_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  done_by     uuid references users(id) on delete set null,
  done_at     timestamptz,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index on task_checklist_items(task_id, position);

-- ---------- Comments ----------
create table task_comments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index on task_comments(task_id, created_at);

-- ---------- Activity history ----------
create table task_activity (
  id          bigserial primary key,
  org_id      uuid not null references organizations(id) on delete cascade,
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,   -- null = done by the system (e.g. recurrence)
  action      text not null,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on task_activity(task_id, created_at);
