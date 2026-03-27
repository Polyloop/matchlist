-- Organization settings for API keys and configuration
-- Keys are stored encrypted (application-level encryption before insert)
create table org_settings (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  key text not null,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, key)
);

create index idx_org_settings_org_id on org_settings(org_id);

-- RLS
alter table org_settings enable row level security;

create policy "org_settings_org_isolation" on org_settings
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );
