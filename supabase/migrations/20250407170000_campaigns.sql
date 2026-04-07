-- Campaign types enum
create type campaign_type as enum (
  'donation_matching', 'grant_research', 'corporate_sponsorship',
  'volunteer_matching', 'in_kind_donation'
);

-- Campaign status enum
create type campaign_status as enum ('draft', 'active', 'completed', 'archived');

-- Campaigns table
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  type campaign_type not null,
  status campaign_status default 'draft' not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_campaigns_org_id on campaigns(org_id);
create index idx_campaigns_org_status on campaigns(org_id, status);

-- Campaign enrichment configuration (defines which columns appear per campaign)
create table campaign_enrichment_configs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  enrichment_type text not null,
  column_order int not null default 0,
  enabled boolean default true,
  config jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(campaign_id, enrichment_type)
);

create index idx_campaign_enrichment_configs_campaign on campaign_enrichment_configs(campaign_id);

-- Add campaign_id FK to existing tables (nullable for migration safety)
alter table prospects add column campaign_id uuid references campaigns(id) on delete set null;
alter table enrichment_jobs add column campaign_id uuid references campaigns(id) on delete set null;
alter table outreach_messages add column campaign_id uuid references campaigns(id) on delete set null;
alter table import_batches add column campaign_id uuid references campaigns(id) on delete set null;

-- Indexes on new FK columns
create index idx_prospects_campaign_id on prospects(campaign_id);
create index idx_enrichment_jobs_campaign_id on enrichment_jobs(campaign_id);
create index idx_outreach_messages_campaign_id on outreach_messages(campaign_id);
create index idx_import_batches_campaign_id on import_batches(campaign_id);

-- RLS for campaigns
alter table campaigns enable row level security;
create policy "campaigns_org_isolation" on campaigns for all using (
  org_id in (select id from organizations where clerk_org_id = (auth.jwt() ->> 'org_id'))
);

-- RLS for campaign_enrichment_configs (via campaign ownership)
alter table campaign_enrichment_configs enable row level security;
create policy "campaign_enrichment_configs_isolation" on campaign_enrichment_configs for all using (
  campaign_id in (select id from campaigns where org_id in (
    select id from organizations where clerk_org_id = (auth.jwt() ->> 'org_id')
  ))
);

-- Data migration: create a default "Donation Matching" campaign per org
-- and assign all existing records to it
insert into campaigns (org_id, name, type, status, description)
select id, 'Donation Matching', 'donation_matching', 'active',
       'Default campaign created during migration'
from organizations;

-- Assign existing prospects to their org's default campaign
update prospects p
set campaign_id = c.id
from campaigns c
where p.org_id = c.org_id and p.campaign_id is null;

-- Assign existing enrichment_jobs
update enrichment_jobs ej
set campaign_id = c.id
from campaigns c
where ej.org_id = c.org_id and ej.campaign_id is null;

-- Assign existing outreach_messages
update outreach_messages om
set campaign_id = c.id
from campaigns c
where om.org_id = c.org_id and om.campaign_id is null;

-- Assign existing import_batches
update import_batches ib
set campaign_id = c.id
from campaigns c
where ib.org_id = c.org_id and ib.campaign_id is null;
