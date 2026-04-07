-- Enrichment result status
create type enrichment_result_status as enum ('pending', 'running', 'success', 'failed');

-- Per-prospect, per-enrichment-type results (cell-level data)
create table enrichment_results (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  org_id uuid references organizations(id) on delete cascade not null,
  enrichment_type text not null,
  status enrichment_result_status default 'pending' not null,
  result jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(prospect_id, campaign_id, enrichment_type)
);

create index idx_enrichment_results_prospect on enrichment_results(prospect_id);
create index idx_enrichment_results_campaign on enrichment_results(campaign_id);
create index idx_enrichment_results_type_status on enrichment_results(enrichment_type, status);
create index idx_enrichment_results_org on enrichment_results(org_id);

-- RLS
alter table enrichment_results enable row level security;
create policy "enrichment_results_org_isolation" on enrichment_results
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );

-- Enable Supabase Realtime on enrichment_results
alter publication supabase_realtime add table enrichment_results;

-- Migrate existing flat prospect fields to enrichment_results
-- Only for prospects that have a campaign_id (i.e. migrated data)
insert into enrichment_results (prospect_id, campaign_id, org_id, enrichment_type, status, result)
select
  p.id, p.campaign_id, p.org_id,
  'employer_lookup', 'success',
  jsonb_build_object('employer', p.employer)
from prospects p
where p.employer is not null and p.campaign_id is not null;

insert into enrichment_results (prospect_id, campaign_id, org_id, enrichment_type, status, result)
select
  p.id, p.campaign_id, p.org_id,
  'match_programme', 'success',
  jsonb_build_object(
    'match_ratio', p.employer_match_ratio,
    'match_cap', p.employer_match_cap,
    'match_eligible', p.match_eligible
  )
from prospects p
where p.employer_match_ratio is not null and p.campaign_id is not null;
