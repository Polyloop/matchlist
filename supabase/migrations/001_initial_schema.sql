-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Organizations (linked to Clerk org)
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  clerk_org_id text unique not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prospects
create table prospects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  email text,
  linkedin_url text,
  employer text,
  employer_match_ratio numeric,
  employer_match_cap numeric,
  match_eligible boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prospect Lists
create table prospect_lists (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Many-to-many: prospects <-> lists
create table prospect_list_members (
  prospect_id uuid references prospects(id) on delete cascade,
  list_id uuid references prospect_lists(id) on delete cascade,
  primary key (prospect_id, list_id)
);

-- Enrichment Jobs
create type enrichment_stage as enum (
  'pending', 'scraped', 'enriched', 'matched',
  'message_generated', 'sent', 'failed'
);

create table enrichment_jobs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade not null,
  stage enrichment_stage default 'pending' not null,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Outreach Messages
create table outreach_messages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade not null,
  content text not null,
  status text default 'draft' not null,
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_prospects_org_id on prospects(org_id);
create index idx_enrichment_jobs_org_id on enrichment_jobs(org_id);
create index idx_enrichment_jobs_prospect_id on enrichment_jobs(prospect_id);
create index idx_outreach_messages_org_id on outreach_messages(org_id);
create index idx_outreach_messages_prospect_id on outreach_messages(prospect_id);
