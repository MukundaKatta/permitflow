-- PermitFlow Database Schema
-- Migration 001: Initial schema with all core tables

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

create type business_entity_type as enum (
  'sole_proprietorship',
  'llc',
  'corporation',
  's_corp',
  'partnership',
  'nonprofit'
);

create type permit_status as enum (
  'not_started',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
  'denied',
  'expired',
  'renewal_needed'
);

create type deadline_type as enum (
  'application',
  'renewal',
  'inspection',
  'payment',
  'document_submission',
  'hearing'
);

create type subscription_tier as enum (
  'free',
  'starter',
  'professional',
  'enterprise'
);

create type document_type as enum (
  'application_form',
  'supporting_document',
  'certificate',
  'license',
  'inspection_report',
  'correspondence',
  'receipt'
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription_tier subscription_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_owner on organizations(owner_id);
create index idx_organizations_stripe on organizations(stripe_customer_id);

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================

create table business_profiles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  business_name text not null,
  entity_type business_entity_type not null,
  industry text not null,
  naics_code text,
  description text,
  employee_count integer default 0,
  annual_revenue_range text,
  -- Location
  street_address text not null,
  city text not null,
  county text,
  state text not null,
  zip_code text not null,
  country text not null default 'US',
  -- Contact
  phone text,
  email text,
  website text,
  -- Flags
  serves_food boolean default false,
  sells_alcohol boolean default false,
  handles_hazardous_materials boolean default false,
  has_signage boolean default false,
  has_employees boolean default false,
  operates_from_home boolean default false,
  -- Metadata
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_business_profiles_org on business_profiles(organization_id);
create index idx_business_profiles_state on business_profiles(state);
create index idx_business_profiles_industry on business_profiles(industry);

-- ============================================================
-- JURISDICTIONS
-- ============================================================

create table jurisdictions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  level text not null check (level in ('federal', 'state', 'county', 'city')),
  state text,
  county text,
  city text,
  website text,
  contact_phone text,
  contact_email text,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(level, state, county, city)
);

create index idx_jurisdictions_level on jurisdictions(level);
create index idx_jurisdictions_state on jurisdictions(state);

-- ============================================================
-- REGULATIONS (with embeddings for RAG)
-- ============================================================

create table regulations (
  id uuid primary key default uuid_generate_v4(),
  jurisdiction_id uuid not null references jurisdictions(id) on delete cascade,
  title text not null,
  section_code text,
  content text not null,
  summary text,
  category text not null,
  subcategory text,
  applicable_industries text[] default '{}',
  applicable_entity_types business_entity_type[] default '{}',
  source_url text,
  effective_date date,
  expiration_date date,
  -- Vector embedding for RAG
  embedding vector(1536),
  -- Metadata
  chunk_index integer default 0,
  parent_regulation_id uuid references regulations(id),
  content_hash text not null,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_regulations_jurisdiction on regulations(jurisdiction_id);
create index idx_regulations_category on regulations(category);
create index idx_regulations_industries on regulations using gin(applicable_industries);
create index idx_regulations_embedding on regulations using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_regulations_content_hash on regulations(content_hash);
create index idx_regulations_content_trgm on regulations using gin(content gin_trgm_ops);

-- ============================================================
-- PERMITS
-- ============================================================

create table permits (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  business_profile_id uuid not null references business_profiles(id) on delete cascade,
  jurisdiction_id uuid references jurisdictions(id),
  regulation_id uuid references regulations(id),
  -- Permit details
  name text not null,
  description text,
  category text not null,
  status permit_status not null default 'not_started',
  priority integer not null default 0 check (priority between 0 and 10),
  -- Requirements
  estimated_cost numeric(10, 2),
  actual_cost numeric(10, 2),
  estimated_processing_days integer,
  requirements jsonb default '[]',
  application_url text,
  -- Tracking
  application_number text,
  submitted_at timestamptz,
  approved_at timestamptz,
  expires_at timestamptz,
  renewal_period_months integer,
  notes text,
  -- Metadata
  ai_generated boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_permits_org on permits(organization_id);
create index idx_permits_business on permits(business_profile_id);
create index idx_permits_status on permits(status);
create index idx_permits_expires on permits(expires_at);

-- ============================================================
-- PERMIT DEADLINES
-- ============================================================

create table permit_deadlines (
  id uuid primary key default uuid_generate_v4(),
  permit_id uuid not null references permits(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  deadline_type deadline_type not null,
  due_date timestamptz not null,
  completed boolean not null default false,
  completed_at timestamptz,
  -- Reminder settings
  reminder_days_before integer[] default '{30, 14, 7, 1}',
  last_reminder_sent_at timestamptz,
  next_reminder_at timestamptz,
  -- Recurrence
  is_recurring boolean not null default false,
  recurrence_months integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deadlines_permit on permit_deadlines(permit_id);
create index idx_deadlines_org on permit_deadlines(organization_id);
create index idx_deadlines_due on permit_deadlines(due_date) where not completed;
create index idx_deadlines_next_reminder on permit_deadlines(next_reminder_at) where not completed;

-- ============================================================
-- DOCUMENTS
-- ============================================================

create table documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  permit_id uuid references permits(id) on delete set null,
  name text not null,
  document_type document_type not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  -- Auto-fill tracking
  is_auto_filled boolean not null default false,
  auto_fill_data jsonb,
  -- Metadata
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_org on documents(organization_id);
create index idx_documents_permit on documents(permit_id);

-- ============================================================
-- CHAT HISTORY
-- ============================================================

create table chat_history (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null default uuid_generate_v4(),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  -- References to regulations used in RAG
  referenced_regulation_ids uuid[] default '{}',
  -- Token usage tracking
  input_tokens integer,
  output_tokens integer,
  model text,
  created_at timestamptz not null default now()
);

create index idx_chat_org on chat_history(organization_id);
create index idx_chat_session on chat_history(session_id);
create index idx_chat_user on chat_history(user_id);
create index idx_chat_created on chat_history(created_at);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================

create table notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  reminder_days integer[] default '{30, 14, 7, 1}',
  daily_digest boolean not null default false,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, organization_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations enable row level security;
alter table business_profiles enable row level security;
alter table permits enable row level security;
alter table permit_deadlines enable row level security;
alter table documents enable row level security;
alter table chat_history enable row level security;
alter table notification_preferences enable row level security;

-- Organizations: owner can do everything
create policy "org_select" on organizations for select using (owner_id = auth.uid());
create policy "org_insert" on organizations for insert with check (owner_id = auth.uid());
create policy "org_update" on organizations for update using (owner_id = auth.uid());
create policy "org_delete" on organizations for delete using (owner_id = auth.uid());

-- Business profiles: org members
create policy "bp_select" on business_profiles for select using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "bp_insert" on business_profiles for insert with check (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "bp_update" on business_profiles for update using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "bp_delete" on business_profiles for delete using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);

-- Permits
create policy "permits_select" on permits for select using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "permits_insert" on permits for insert with check (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "permits_update" on permits for update using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "permits_delete" on permits for delete using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);

-- Deadlines
create policy "deadlines_select" on permit_deadlines for select using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "deadlines_insert" on permit_deadlines for insert with check (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "deadlines_update" on permit_deadlines for update using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);

-- Documents
create policy "docs_select" on documents for select using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "docs_insert" on documents for insert with check (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "docs_update" on documents for update using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);
create policy "docs_delete" on documents for delete using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);

-- Chat
create policy "chat_select" on chat_history for select using (user_id = auth.uid());
create policy "chat_insert" on chat_history for insert with check (user_id = auth.uid());

-- Notifications
create policy "notif_select" on notification_preferences for select using (user_id = auth.uid());
create policy "notif_insert" on notification_preferences for insert with check (user_id = auth.uid());
create policy "notif_update" on notification_preferences for update using (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to search regulations by embedding similarity
create or replace function match_regulations(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_jurisdiction_id uuid default null,
  filter_category text default null
)
returns table (
  id uuid,
  jurisdiction_id uuid,
  title text,
  content text,
  summary text,
  category text,
  source_url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    r.id,
    r.jurisdiction_id,
    r.title,
    r.content,
    r.summary,
    r.category,
    r.source_url,
    1 - (r.embedding <=> query_embedding) as similarity
  from regulations r
  where
    1 - (r.embedding <=> query_embedding) > match_threshold
    and (filter_jurisdiction_id is null or r.jurisdiction_id = filter_jurisdiction_id)
    and (filter_category is null or r.category = filter_category)
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function to get upcoming deadlines with permit info
create or replace function get_upcoming_deadlines(
  org_id uuid,
  days_ahead int default 30
)
returns table (
  deadline_id uuid,
  permit_id uuid,
  permit_name text,
  deadline_title text,
  deadline_type deadline_type,
  due_date timestamptz,
  days_until integer,
  permit_status permit_status
)
language plpgsql
security definer
as $$
begin
  return query
  select
    d.id as deadline_id,
    p.id as permit_id,
    p.name as permit_name,
    d.title as deadline_title,
    d.deadline_type,
    d.due_date,
    extract(day from d.due_date - now())::integer as days_until,
    p.status as permit_status
  from permit_deadlines d
  join permits p on p.id = d.permit_id
  where
    d.organization_id = org_id
    and not d.completed
    and d.due_date between now() and now() + (days_ahead || ' days')::interval
  order by d.due_date asc;
end;
$$;

-- Function to compute next reminder date
create or replace function compute_next_reminder(
  due timestamptz,
  reminder_days int[],
  last_sent timestamptz default null
)
returns timestamptz
language plpgsql
as $$
declare
  day_val int;
  reminder_date timestamptz;
begin
  foreach day_val in array reminder_days loop
    reminder_date := due - (day_val || ' days')::interval;
    if reminder_date > now() and (last_sent is null or reminder_date > last_sent) then
      return reminder_date;
    end if;
  end loop;
  return null;
end;
$$;

-- Trigger to update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated before update on organizations
  for each row execute function update_updated_at();
create trigger trg_business_profiles_updated before update on business_profiles
  for each row execute function update_updated_at();
create trigger trg_permits_updated before update on permits
  for each row execute function update_updated_at();
create trigger trg_deadlines_updated before update on permit_deadlines
  for each row execute function update_updated_at();
create trigger trg_documents_updated before update on documents
  for each row execute function update_updated_at();

-- Trigger to compute next reminder on deadline insert/update
create or replace function update_next_reminder()
returns trigger as $$
begin
  new.next_reminder_at := compute_next_reminder(
    new.due_date,
    new.reminder_days_before,
    new.last_reminder_sent_at
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_deadline_reminder before insert or update on permit_deadlines
  for each row execute function update_next_reminder();
