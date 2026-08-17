-- Buzón técnico privado del Laboratorio HVT.
-- Ejecutar completo en Supabase > SQL Editor con una cuenta propietaria del proyecto.

create extension if not exists pgcrypto;

create table if not exists public.lab_team_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('analyst','coordinator','admin')),
    display_name text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.lab_cases (
    id uuid primary key default gen_random_uuid(),
    reference text not null unique,
    owner_id uuid not null references auth.users(id) on delete cascade,
    question text not null check (char_length(question) between 3 and 3000),
    project_name text check (project_name is null or char_length(project_name) <= 160),
    contact_email text not null check (char_length(contact_email) between 5 and 254),
    status text not null default 'uploading' check (status in ('uploading','new','reviewing','answered','closed')),
    processing_consent boolean not null check (processing_consent = true),
    improvement_consent boolean not null default false,
    consent_version text not null,
    source_path text,
    language text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    retention_until timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.lab_case_files (
    id uuid primary key default gen_random_uuid(),
    case_id uuid not null references public.lab_cases(id) on delete cascade,
    owner_id uuid not null references auth.users(id) on delete cascade,
    storage_path text not null unique,
    original_name text not null check (char_length(original_name) between 1 and 240),
    mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf','text/csv')),
    size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 15728640),
    sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
    created_at timestamptz not null default now()
);

create table if not exists public.lab_case_events (
    id bigint generated always as identity primary key,
    case_id uuid not null references public.lab_cases(id) on delete cascade,
    actor_id uuid default auth.uid() references auth.users(id) on delete set null,
    action text not null,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists lab_cases_created_idx on public.lab_cases (created_at desc);
create index if not exists lab_cases_status_idx on public.lab_cases (status, created_at desc);
create index if not exists lab_cases_retention_idx on public.lab_cases (retention_until);
create index if not exists lab_case_files_case_idx on public.lab_case_files (case_id);
create index if not exists lab_case_events_case_idx on public.lab_case_events (case_id, created_at desc);

create or replace function public.is_lab_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.lab_team_members
        where user_id = (select auth.uid()) and active = true
    );
$$;

create or replace function public.lab_team_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select role from public.lab_team_members
    where user_id = (select auth.uid()) and active = true
    limit 1;
$$;

revoke all on function public.is_lab_team_member() from public;
revoke all on function public.lab_team_role() from public;
grant execute on function public.is_lab_team_member() to authenticated;
grant execute on function public.lab_team_role() to authenticated;

create or replace function public.lab_case_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.owner_id := (select auth.uid());
    new.reference := 'HVT-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
    new.status := 'uploading';
    new.processing_consent := true;
    new.created_at := now();
    new.updated_at := now();
    new.retention_until := now() + interval '30 days';
    return new;
end;
$$;

drop trigger if exists lab_case_defaults_trigger on public.lab_cases;
create trigger lab_case_defaults_trigger before insert on public.lab_cases
for each row execute function public.lab_case_defaults();

create or replace function public.lab_case_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists lab_case_updated_trigger on public.lab_cases;
create trigger lab_case_updated_trigger before update on public.lab_cases
for each row execute function public.lab_case_updated_at();

create or replace function public.lab_file_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.owner_id := (select auth.uid());
    if not exists (
        select 1 from public.lab_cases
        where id = new.case_id and owner_id = (select auth.uid()) and status = 'uploading'
    ) then
        raise exception 'El caso no pertenece al usuario o ya fue cerrado para cargas';
    end if;
    if new.storage_path not like ((select auth.uid()::text) || '/' || new.case_id::text || '/%') then
        raise exception 'La ruta del archivo no corresponde al caso';
    end if;
    if (select count(*) from public.lab_case_files where case_id = new.case_id) >= 5 then
        raise exception 'El caso ya alcanzó el máximo de cinco archivos';
    end if;
    if coalesce((select sum(size_bytes) from public.lab_case_files where case_id = new.case_id), 0) + new.size_bytes > 26214400 then
        raise exception 'El caso supera el máximo total de 25 MB';
    end if;
    return new;
end;
$$;

drop trigger if exists lab_file_owner_trigger on public.lab_case_files;
create trigger lab_file_owner_trigger before insert on public.lab_case_files
for each row execute function public.lab_file_owner();

create or replace function public.finalize_lab_case(target_case uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.lab_cases c
        where c.id = target_case and c.owner_id = (select auth.uid()) and c.status = 'uploading'
    ) then
        raise exception 'Caso inválido o ya finalizado';
    end if;
    if not exists (select 1 from public.lab_case_files f where f.case_id = target_case) then
        raise exception 'El caso no contiene archivos';
    end if;
    update public.lab_cases set status = 'new' where id = target_case;
    insert into public.lab_case_events (case_id, actor_id, action)
    values (target_case, (select auth.uid()), 'submitted');
end;
$$;

revoke all on function public.finalize_lab_case(uuid) from public;
grant execute on function public.finalize_lab_case(uuid) to authenticated;

create or replace function public.lab_can_upload_evidence(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        split_part(object_name, '/', 1) = (select auth.uid()::text)
        and exists (
            select 1 from public.lab_cases c
            where c.id::text = split_part(object_name, '/', 2)
              and c.owner_id = (select auth.uid())
              and c.status = 'uploading'
        )
        and (
            select count(*) from storage.objects o
            where o.bucket_id = 'lab-evidence'
              and o.name like split_part(object_name, '/', 1) || '/' || split_part(object_name, '/', 2) || '/%'
        ) < 5;
$$;

revoke all on function public.lab_can_upload_evidence(text) from public;
grant execute on function public.lab_can_upload_evidence(text) to authenticated;

alter table public.lab_team_members enable row level security;
alter table public.lab_cases enable row level security;
alter table public.lab_case_files enable row level security;
alter table public.lab_case_events enable row level security;

drop policy if exists "team reads own membership" on public.lab_team_members;
create policy "team reads own membership" on public.lab_team_members
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users create own cases" on public.lab_cases;
create policy "users create own cases" on public.lab_cases
for insert to authenticated with check (owner_id = (select auth.uid()) and processing_consent = true);
drop policy if exists "users read own cases" on public.lab_cases;
create policy "users read own cases" on public.lab_cases
for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "team reads all cases" on public.lab_cases;
create policy "team reads all cases" on public.lab_cases
for select to authenticated using ((select public.is_lab_team_member()));
drop policy if exists "team updates cases" on public.lab_cases;
create policy "team updates cases" on public.lab_cases
for update to authenticated using ((select public.is_lab_team_member())) with check ((select public.is_lab_team_member()));
drop policy if exists "owners delete incomplete cases" on public.lab_cases;
create policy "owners delete incomplete cases" on public.lab_cases
for delete to authenticated using (owner_id = (select auth.uid()) and status = 'uploading');
drop policy if exists "admins delete cases" on public.lab_cases;
create policy "admins delete cases" on public.lab_cases
for delete to authenticated using ((select public.lab_team_role()) = 'admin');

drop policy if exists "users add own file metadata" on public.lab_case_files;
create policy "users add own file metadata" on public.lab_case_files
for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "users read own file metadata" on public.lab_case_files;
create policy "users read own file metadata" on public.lab_case_files
for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "team reads all file metadata" on public.lab_case_files;
create policy "team reads all file metadata" on public.lab_case_files
for select to authenticated using ((select public.is_lab_team_member()));

drop policy if exists "team reads case events" on public.lab_case_events;
create policy "team reads case events" on public.lab_case_events
for select to authenticated using ((select public.is_lab_team_member()));
drop policy if exists "team adds case events" on public.lab_case_events;
create policy "team adds case events" on public.lab_case_events
for insert to authenticated with check ((select public.is_lab_team_member()) and actor_id = (select auth.uid()));

revoke all on public.lab_team_members, public.lab_cases, public.lab_case_files, public.lab_case_events from anon;
grant select on public.lab_team_members to authenticated;
grant select, insert, update, delete on public.lab_cases to authenticated;
grant select, insert on public.lab_case_files to authenticated;
grant select, insert on public.lab_case_events to authenticated;
grant usage, select on sequence public.lab_case_events_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'lab-evidence', 'lab-evidence', false, 15728640,
    array['image/jpeg','image/png','image/webp','application/pdf','text/csv']
)
on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload case evidence" on storage.objects;
create policy "users upload case evidence" on storage.objects
for insert to authenticated with check (
    bucket_id = 'lab-evidence'
    and (select public.lab_can_upload_evidence(name))
);
drop policy if exists "users read own case evidence" on storage.objects;
create policy "users read own case evidence" on storage.objects
for select to authenticated using (
    bucket_id = 'lab-evidence' and owner_id = (select auth.uid()::text)
);
drop policy if exists "team reads case evidence" on storage.objects;
create policy "team reads case evidence" on storage.objects
for select to authenticated using (
    bucket_id = 'lab-evidence' and (select public.is_lab_team_member())
);
drop policy if exists "users remove incomplete evidence" on storage.objects;
create policy "users remove incomplete evidence" on storage.objects
for delete to authenticated using (
    bucket_id = 'lab-evidence'
    and owner_id = (select auth.uid()::text)
    and exists (
        select 1 from public.lab_cases c
        where c.id::text = (storage.foldername(name))[2]
          and c.owner_id = (select auth.uid())
          and c.status = 'uploading'
    )
);
drop policy if exists "admins remove case evidence" on storage.objects;
create policy "admins remove case evidence" on storage.objects
for delete to authenticated using (
    bucket_id = 'lab-evidence' and (select public.lab_team_role()) = 'admin'
);

comment on table public.lab_cases is 'Casos técnicos temporales enviados voluntariamente al Laboratorio HVT.';
comment on column public.lab_cases.improvement_consent is 'Autorización separada para usar datos técnicos desidentificados en mejoras.';
