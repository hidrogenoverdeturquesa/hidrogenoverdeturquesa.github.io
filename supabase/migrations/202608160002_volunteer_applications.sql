-- Postulaciones privadas al programa de voluntariado HVT.
create extension if not exists pgcrypto;

create table if not exists public.volunteer_applications (
    id uuid primary key default gen_random_uuid(),
    reference text not null unique,
    owner_id uuid not null references auth.users(id) on delete cascade,
    full_name text not null check (char_length(full_name) between 3 and 120),
    email text not null check (char_length(email) between 5 and 254),
    phone text check (phone is null or char_length(phone) <= 40),
    interest_area text not null check (char_length(interest_area) between 2 and 120),
    availability text not null check (char_length(availability) between 2 and 160),
    contribution text not null check (char_length(contribution) between 20 and 1500),
    status text not null default 'uploading' check (status in ('uploading','received','reviewing','shortlisted','closed')),
    processing_consent boolean not null check (processing_consent = true),
    consent_version text not null,
    source_path text,
    cv_storage_path text unique,
    cv_original_name text,
    cv_size_bytes bigint check (cv_size_bytes is null or cv_size_bytes between 1 and 5242880),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    retention_until timestamptz not null default (now() + interval '6 months')
);

create index if not exists volunteer_applications_created_idx on public.volunteer_applications (created_at desc);
create index if not exists volunteer_applications_status_idx on public.volunteer_applications (status, created_at desc);

create or replace function public.volunteer_application_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    new.owner_id := (select auth.uid());
    new.reference := 'HVT-VOL-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
    new.status := 'uploading';
    new.created_at := now();
    new.updated_at := now();
    new.retention_until := now() + interval '6 months';
    return new;
end;
$$;

drop trigger if exists volunteer_application_defaults_trigger on public.volunteer_applications;
create trigger volunteer_application_defaults_trigger before insert on public.volunteer_applications
for each row execute function public.volunteer_application_defaults();

create or replace function public.finalize_volunteer_application(
    target_application uuid,
    target_storage_path text,
    target_original_name text,
    target_size_bytes bigint
) returns void language plpgsql security definer set search_path = '' as $$
begin
    if target_size_bytes < 1 or target_size_bytes > 5242880 then raise exception 'Tamaño de archivo inválido'; end if;
    if target_storage_path not like ((select auth.uid()::text) || '/' || target_application::text || '/%') then
        raise exception 'Ruta de archivo inválida';
    end if;
    update public.volunteer_applications
    set status = 'received', cv_storage_path = target_storage_path,
        cv_original_name = left(target_original_name, 240), cv_size_bytes = target_size_bytes,
        updated_at = now()
    where id = target_application and owner_id = (select auth.uid()) and status = 'uploading';
    if not found then raise exception 'Postulación inválida o finalizada'; end if;
end;
$$;

revoke all on function public.finalize_volunteer_application(uuid,text,text,bigint) from public;
grant execute on function public.finalize_volunteer_application(uuid,text,text,bigint) to authenticated;

alter table public.volunteer_applications enable row level security;
revoke all on public.volunteer_applications from anon;
grant select, insert on public.volunteer_applications to authenticated;

drop policy if exists "applicants create own application" on public.volunteer_applications;
create policy "applicants create own application" on public.volunteer_applications
for insert to authenticated with check (owner_id = (select auth.uid()) and processing_consent = true);
drop policy if exists "applicants read own application" on public.volunteer_applications;
create policy "applicants read own application" on public.volunteer_applications
for select to authenticated using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('volunteer-cvs', 'volunteer-cvs', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "applicants upload own cv" on storage.objects;
create policy "applicants upload own cv" on storage.objects
for insert to authenticated with check (
    bucket_id = 'volunteer-cvs' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
drop policy if exists "applicants read own cv" on storage.objects;
create policy "applicants read own cv" on storage.objects
for select to authenticated using (
    bucket_id = 'volunteer-cvs' and owner_id = (select auth.uid()::text)
);
