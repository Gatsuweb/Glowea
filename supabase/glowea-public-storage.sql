-- Glowea - Supabase Storage policies for the public gallery bucket.
-- Bucket: glowea-public
--
-- Important:
-- Glowea currently authenticates users with Clerk. These policies assume the
-- JWT sent to Supabase exposes either:
-- - tenant_id
-- - tenantId
-- - sub
--
-- In the current Glowea codebase, tenantId matches the Clerk user id, so the
-- first folder of every object path must be the tenant id:
--   glowea-public/{tenantId}/gallery/{filename}
--   glowea-public/{tenantId}/services/{filename}
--   glowea-public/{tenantId}/covers/{filename}
--   glowea-public/{tenantId}/avatars/{filename}
--
-- If browser uploads are kept, Clerk must be bridged to Supabase JWT auth.
-- Otherwise, keep writes server-side and only rely on the public read policy.

insert into storage.buckets (id, name, public)
values ('glowea-public', 'glowea-public', true)
on conflict (id) do update
set public = true;

create or replace function public.glowea_storage_actor_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'tenant_id', ''),
    nullif(auth.jwt() ->> 'tenantId', ''),
    nullif(auth.jwt() ->> 'sub', '')
  );
$$;

drop policy if exists "Glowea public read" on storage.objects;
create policy "Glowea public read"
on storage.objects
for select
to public
using (bucket_id = 'glowea-public');

drop policy if exists "Glowea tenant insert" on storage.objects;
create policy "Glowea tenant insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'glowea-public'
  and public.glowea_storage_actor_id() is not null
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = public.glowea_storage_actor_id()
);

drop policy if exists "Glowea tenant update" on storage.objects;
create policy "Glowea tenant update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'glowea-public'
  and public.glowea_storage_actor_id() is not null
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = public.glowea_storage_actor_id()
)
with check (
  bucket_id = 'glowea-public'
  and public.glowea_storage_actor_id() is not null
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = public.glowea_storage_actor_id()
);

drop policy if exists "Glowea tenant delete" on storage.objects;
create policy "Glowea tenant delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'glowea-public'
  and public.glowea_storage_actor_id() is not null
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = public.glowea_storage_actor_id()
);
