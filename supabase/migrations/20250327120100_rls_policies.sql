-- Enable RLS on all tables
alter table organizations enable row level security;
alter table prospects enable row level security;
alter table prospect_lists enable row level security;
alter table prospect_list_members enable row level security;
alter table enrichment_jobs enable row level security;
alter table outreach_messages enable row level security;

-- Organizations: users can only see their own org
create policy "org_read_own" on organizations
  for select using (
    clerk_org_id = (auth.jwt() ->> 'org_id')
  );

-- Prospects: org isolation
create policy "prospects_org_isolation" on prospects
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );

-- Prospect Lists: org isolation
create policy "prospect_lists_org_isolation" on prospect_lists
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );

-- Prospect List Members: org isolation via list ownership
create policy "prospect_list_members_org_isolation" on prospect_list_members
  for all using (
    list_id in (
      select id from prospect_lists
      where org_id in (
        select id from organizations
        where clerk_org_id = (auth.jwt() ->> 'org_id')
      )
    )
  );

-- Enrichment Jobs: org isolation
create policy "enrichment_jobs_org_isolation" on enrichment_jobs
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );

-- Outreach Messages: org isolation
create policy "outreach_messages_org_isolation" on outreach_messages
  for all using (
    org_id in (
      select id from organizations
      where clerk_org_id = (auth.jwt() ->> 'org_id')
    )
  );
