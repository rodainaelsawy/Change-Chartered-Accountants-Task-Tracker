-- "Clients" are now called "companies" (شركات). Existing data is kept: tables and columns are renamed in place.
alter table clients rename to companies;
alter table companies rename column company to activity;      -- النشاط
alter table tasks rename column client_id to company_id;

alter index if exists clients_pkey rename to companies_pkey;
alter index if exists clients_org_id_idx rename to companies_org_id_idx;
alter index if exists tasks_client_id_idx rename to tasks_company_id_idx;

-- البيانات الضريبية: login to the tax authority portal. The password is stored encrypted (AES-256-GCM, see lib/crypto.ts).
alter table companies
  add column tax_email        text,
  add column tax_username     text,
  add column tax_password_enc text;

-- المرفقات: PDFs. One commercial register and one tax card per company (a new upload replaces the old one), any number of "other".
create type attachment_kind as enum ('commercial_register', 'tax_card', 'other');

create table company_attachments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  company_id   uuid not null references companies(id) on delete cascade,
  kind         attachment_kind not null,
  file_name    text not null,
  size_bytes   int  not null,
  storage_key  text not null,     -- Vercel Blob pathname (production) or path under .uploads/ (local development)
  uploaded_by  uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on company_attachments(company_id);
create unique index company_attachments_single_kind on company_attachments(company_id, kind) where kind <> 'other';
