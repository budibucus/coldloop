-- Named, reusable campaigns: each targets one objective (reusing the existing
-- initial/followup1/followup2 templates), optionally its own attachment, and
-- a cumulative max-send ceiling so a campaign can't be re-run past it.
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  objective public.email_sequence_step not null,
  attachment_path text,
  attachment_filename text,
  max_send_count integer not null default 30,
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "campaigns_select_own" on public.campaigns
  for select using (auth.uid() = user_id);
create policy "campaigns_insert_own" on public.campaigns
  for insert with check (auth.uid() = user_id);
create policy "campaigns_update_own" on public.campaigns
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "campaigns_delete_own" on public.campaigns
  for delete using (auth.uid() = user_id);

-- Track which campaign (if any) produced each email, for per-campaign
-- reporting and for enforcing a campaign's cumulative max_send_count.
alter table public.emails
  add column campaign_id uuid references public.campaigns(id) on delete set null;

create index emails_campaign_id_idx on public.emails(campaign_id);
