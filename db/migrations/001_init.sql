-- Task & Deadline Tracker — initial schema (plain PostgreSQL 13+)

create extension if not exists pgcrypto;

create type task_status   as enum ('not_started', 'in_progress', 'on_hold', 'done', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type user_role     as enum ('admin', 'member');          -- Phase 3 adds assignee / follower
create type notif_kind    as enum ('due_soon', 'due_today', 'overdue');

create table organizations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  timezone           text not null default 'Africa/Cairo',
  reminder_days      int  not null default 2 check (reminder_days between 0 and 60),   -- FR-5.1
  last_reminder_run  date,
  created_at         timestamptz not null default now()
);

create table users (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  email          text not null,
  full_name      text not null default '',
  password_hash  text,                                   -- null until the invited user sets a password
  role           user_role not null default 'member',
  email_digest   boolean not null default true,          -- FR-5.5
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));
create index on users(org_id);

create table sessions (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index on sessions(user_id);

-- Used for password reset (FR-1.2) and invitation links (FR-1.3).
create table password_tokens (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table clients (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  name            text not null,
  company         text,
  contact_person  text,
  email           text,
  phone           text,
  notes           text,
  archived_at     timestamptz,                            -- FR-2.5
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index on clients(org_id);

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  client_id      uuid not null references clients(id) on delete cascade,     -- FR-3.1
  title          text not null,
  description    text,
  deadline       date not null,                                             -- dates only
  priority       task_priority not null default 'medium',
  status         task_status   not null default 'not_started',
  reminder_days  int check (reminder_days between 0 and 60),                -- per-task override, FR-5.2
  created_by     uuid references users(id) on delete set null,
  updated_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index on tasks(org_id, deadline);
create index on tasks(client_id);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  task_id      uuid not null references tasks(id) on delete cascade,
  kind         notif_kind not null,
  notify_date  date not null,       -- due_soon/due_today: the deadline (once per deadline); overdue: the day (daily)
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  unique (user_id, task_id, kind, notify_date)
);
create index on notifications(user_id, read_at);

-- Keep updated_at / completed_at correct (FR-4.2, FR-4.5).
create or replace function tasks_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger tasks_before_write
  before insert or update on tasks for each row execute function tasks_before_write();
