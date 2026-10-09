-- Phase 3: Follower role, per-task followers, review workflow, saved filters.
-- Additive only: the previous code version keeps working until the new one is live.
-- Note: enum values added here are not used inside this file (Postgres does not allow that in the same transaction).

-- Roles: 'admin' (everything), 'member' (= Assignee: works on their own tasks), 'follower' (reviews the tasks they follow).
alter type user_role add value if not exists 'follower';

-- "جاهزة للمراجعة": the assignee finished; a follower of the task approves (→ done) or returns it (→ in_progress).
alter type task_status add value if not exists 'review' before 'done';

alter type notif_kind add value if not exists 'review_requested'; -- to the task's followers
alter type notif_kind add value if not exists 'review_returned';  -- to the assignees (with the follower's comment)
alter type notif_kind add value if not exists 'review_approved';  -- to the assignees
alter type notif_kind add value if not exists 'followed';         -- "you were added as a follower"

create table if not exists task_followers (
  task_id    uuid not null references tasks(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index if not exists task_followers_user_idx on task_followers(user_id);

-- Saved task-list filters, per user ("الفلاتر المحفوظة").
create table if not exists saved_filters (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  query      text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
