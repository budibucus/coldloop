-- Coldloop v1 schema: sender_profiles, contacts, emails, gmail_connections, allowed_senders
-- Every user-owned table carries user_id and is locked down with RLS to auth.uid() = user_id.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- sender_profiles: one onboarding profile per user
create table public.sender_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company text not null,
  sender_name text not null,
  sender_title text,
  product_description text,
  target_segments text,
  tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sender_profiles enable row level security;

create policy "sender_profiles_select_own" on public.sender_profiles
  for select using (auth.uid() = user_id);
create policy "sender_profiles_insert_own" on public.sender_profiles
  for insert with check (auth.uid() = user_id);
create policy "sender_profiles_update_own" on public.sender_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sender_profiles_delete_own" on public.sender_profiles
  for delete using (auth.uid() = user_id);

create trigger sender_profiles_set_updated_at
  before update on public.sender_profiles
  for each row execute function public.set_updated_at();

-- contacts: one campaign's worth of contacts per user
create type public.contact_status as enum ('not_sent', 'sent', 'replied', 'bounced');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  company text,
  personalization_notes text,
  status public.contact_status not null default 'not_sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_user_id_idx on public.contacts(user_id);

alter table public.contacts enable row level security;

create policy "contacts_select_own" on public.contacts
  for select using (auth.uid() = user_id);
create policy "contacts_insert_own" on public.contacts
  for insert with check (auth.uid() = user_id);
create policy "contacts_update_own" on public.contacts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contacts_delete_own" on public.contacts
  for delete using (auth.uid() = user_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- emails: sequence steps sent (or pending) per contact
create type public.email_sequence_step as enum ('initial', 'followup1', 'followup2');
create type public.email_status as enum ('draft', 'sent', 'failed', 'canceled');

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  sequence_step public.email_sequence_step not null,
  subject text not null,
  body text not null,
  sent_at timestamptz,
  status public.email_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index emails_user_id_idx on public.emails(user_id);
create index emails_contact_id_idx on public.emails(contact_id);

alter table public.emails enable row level security;

create policy "emails_select_own" on public.emails
  for select using (auth.uid() = user_id);
create policy "emails_insert_own" on public.emails
  for insert with check (auth.uid() = user_id);
create policy "emails_update_own" on public.emails
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "emails_delete_own" on public.emails
  for delete using (auth.uid() = user_id);

-- gmail_connections: one connected Gmail account per user, tokens encrypted at the app layer
create table public.gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gmail_address text not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

create policy "gmail_connections_select_own" on public.gmail_connections
  for select using (auth.uid() = user_id);
create policy "gmail_connections_insert_own" on public.gmail_connections
  for insert with check (auth.uid() = user_id);
create policy "gmail_connections_update_own" on public.gmail_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gmail_connections_delete_own" on public.gmail_connections
  for delete using (auth.uid() = user_id);

create trigger gmail_connections_set_updated_at
  before update on public.gmail_connections
  for each row execute function public.set_updated_at();

-- allowed_senders: gates who may connect Gmail and send, managed manually (mirrors Google OAuth
-- test users). No user_id column — this isn't user-owned data, it's a global gate list. Regular
-- users may only check whether their own email is on it; only the service role can write to it.
create table public.allowed_senders (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.allowed_senders enable row level security;

create policy "allowed_senders_select_self" on public.allowed_senders
  for select using (auth.jwt() ->> 'email' = email);
