create table import_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  source_filename text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_import_batches_org_id on import_batches(org_id);

alter table prospect_lists
  add column type text not null default 'segment',
  add constraint prospect_lists_type_check
    check (type in ('segment', 'team', 'campaign'));

create unique index idx_prospect_lists_org_type_name
  on prospect_lists(org_id, type, name);

alter table prospects
  add column import_batch_id uuid references import_batches(id) on delete set null,
  add column team_list_id uuid references prospect_lists(id) on delete set null,
  add column campaign_list_id uuid references prospect_lists(id) on delete set null;

create index idx_prospects_import_batch_id on prospects(import_batch_id);
create index idx_prospects_team_list_id on prospects(team_list_id);
create index idx_prospects_campaign_list_id on prospects(campaign_list_id);

alter table import_batches enable row level security;

create policy "import_batches_org_isolation" on import_batches
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );
