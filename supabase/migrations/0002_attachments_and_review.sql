-- Attachments: a per-profile default plus an optional per-contact override.
-- Stored in a private Storage bucket, one folder per user (RLS keyed on that).
alter table public.sender_profiles
  add column default_attachment_path text,
  add column default_attachment_filename text;

alter table public.contacts
  add column attachment_path text,
  add column attachment_filename text;

-- Record what was actually attached (if anything) at send time, for the
-- review UI and history -- independent of whether the source attachment
-- is later changed or removed.
alter table public.emails
  add column attachment_filename text;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_select_own" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_update_own" on storage.objects
  for update using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_delete_own" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
