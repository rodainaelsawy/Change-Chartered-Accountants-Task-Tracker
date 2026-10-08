-- Task templates (قوالب المهام): a named set of tasks that can be applied to one or many companies at once.
-- Each item's deadline = the start date chosen when applying + offset_days.
create table task_templates (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  description  text,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on task_templates(org_id);

create table task_template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references task_templates(id) on delete cascade,
  title        text not null,
  offset_days  int  not null default 0 check (offset_days between 0 and 3650),
  priority     task_priority not null default 'medium',
  recurrence   recurrence_freq,
  checklist    text not null default '',     -- one step per line
  position     int  not null default 0
);
create index on task_template_items(template_id, position);
