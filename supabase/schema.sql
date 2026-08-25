-- EUROPLUS Work Command
-- Run this once in Supabase > SQL Editor > New query.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'team_member'
    check (role in ('director', 'administrator', 'inquiry_lead', 'coordinator', 'assistant', 'team_member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_accounts_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('director', 'administrator')
  );
$$;

revoke all on function public.is_accounts_manager() from public;
grant execute on function public.is_accounts_manager() to authenticated;

create table if not exists public.inquiries (
  id text primary key,
  product text not null,
  details text,
  source text not null default 'WeChat',
  owner_id uuid references public.profiles(id),
  deadline timestamptz,
  stage text not null default 'New',
  priority text not null default 'Normal',
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pi_records (
  id text primary key,
  inquiry_id text not null references public.inquiries(id),
  version integer not null default 1,
  status text not null default 'Draft',
  is_current boolean not null default true,
  order_value_usd numeric(14,2),
  file_path text,
  client_confirmation_path text,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inquiry_id, version)
);

create unique index if not exists one_current_pi_per_inquiry
  on public.pi_records (inquiry_id)
  where is_current = true;

create table if not exists public.orders (
  id text primary key,
  inquiry_id text references public.inquiries(id),
  product text not null,
  supplier text not null,
  owner_id uuid references public.profiles(id),
  order_value_usd numeric(14,2),
  expected_ready_date date,
  payment_status text not null default 'Advance pending',
  production_stage text not null default 'Waiting for advance',
  completion integer not null default 0 check (completion between 0 and 100),
  tracker_status text not null default 'Not ready',
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id text primary key,
  order_id text not null references public.orders(id),
  supplier text not null,
  amount_rmb numeric(14,2) not null,
  payment_type text not null,
  narration text not null,
  due_at timestamptz,
  status text not null default 'Waiting',
  proof_path text,
  requested_by uuid not null references public.profiles(id),
  released_by uuid references public.profiles(id),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.local_expenses (
  id text primary key,
  order_id text references public.orders(id),
  category text not null,
  description text not null,
  amount_rmb numeric(14,2) not null,
  status text not null default 'Recorded',
  receipt_path text,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_updates (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id),
  stage text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  next_action text,
  due_at timestamptz,
  file_paths text[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id),
  inquiry_id text references public.inquiries(id),
  document_type text not null,
  file_name text not null,
  file_path text not null unique,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigint generated by default as identity primary key,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  description text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.record_operational_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  record_id text;
begin
  if auth.uid() is null then
    return new;
  end if;

  record_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'order_id', 'unknown');
  insert into public.activity_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    description,
    details
  ) values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    record_id,
    initcap(replace(tg_table_name, '_', ' ')) || ' ' || lower(tg_op) || ' · ' || record_id,
    jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'inquiries', 'pi_records', 'orders', 'payment_requests',
    'local_expenses', 'production_updates', 'documents'
  ] loop
    execute format('drop trigger if exists audit_%I on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_%I after insert or update on public.%I for each row execute procedure public.record_operational_activity()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- The only restricted business table. Payment requests and factory proofs are
-- deliberately outside this table so the full team can see them.
create table if not exists public.accounts_ledger (
  id text primary key,
  transaction_date date not null default current_date,
  order_id text references public.orders(id),
  narration text not null,
  debit_rmb numeric(14,2) not null default 0,
  credit_rmb numeric(14,2) not null default 0,
  running_balance_rmb numeric(14,2),
  recorded_by uuid not null references public.profiles(id),
  amended_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (debit_rmb >= 0 and credit_rmb >= 0),
  check (debit_rmb > 0 or credit_rmb > 0)
);

alter table public.profiles enable row level security;
alter table public.inquiries enable row level security;
alter table public.pi_records enable row level security;
alter table public.orders enable row level security;
alter table public.payment_requests enable row level security;
alter table public.local_expenses enable row level security;
alter table public.production_updates enable row level security;
alter table public.documents enable row level security;
alter table public.activity_log enable row level security;
alter table public.accounts_ledger enable row level security;

drop policy if exists "team can view profiles" on public.profiles;
create policy "team can view profiles" on public.profiles
  for select to authenticated using (true);
drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles" on public.profiles
  for all to authenticated using (public.is_accounts_manager())
  with check (public.is_accounts_manager());

-- All operational work is visible to all five authenticated team members.
drop policy if exists "team can read inquiries" on public.inquiries;
create policy "team can read inquiries" on public.inquiries for select to authenticated using (true);
drop policy if exists "team can create inquiries" on public.inquiries;
create policy "team can create inquiries" on public.inquiries for insert to authenticated with check (created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "team can update inquiries" on public.inquiries;
create policy "team can update inquiries" on public.inquiries for update to authenticated using (true) with check (updated_by = auth.uid());

drop policy if exists "team can read pi" on public.pi_records;
create policy "team can read pi" on public.pi_records for select to authenticated using (true);
drop policy if exists "team can create pi" on public.pi_records;
create policy "team can create pi" on public.pi_records for insert to authenticated with check (created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "team can update pi" on public.pi_records;
create policy "team can update pi" on public.pi_records for update to authenticated using (true) with check (updated_by = auth.uid());

drop policy if exists "team can read orders" on public.orders;
create policy "team can read orders" on public.orders for select to authenticated using (true);
drop policy if exists "team can create orders" on public.orders;
create policy "team can create orders" on public.orders for insert to authenticated with check (created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "team can update orders" on public.orders;
create policy "team can update orders" on public.orders for update to authenticated using (true) with check (updated_by = auth.uid());

drop policy if exists "team can read payments" on public.payment_requests;
create policy "team can read payments" on public.payment_requests for select to authenticated using (true);
drop policy if exists "team can create payments" on public.payment_requests;
create policy "team can create payments" on public.payment_requests for insert to authenticated with check (requested_by = auth.uid());
drop policy if exists "team can update payments" on public.payment_requests;
create policy "team can update payments" on public.payment_requests for update to authenticated using (true) with check (true);

drop policy if exists "team can read expenses" on public.local_expenses;
create policy "team can read expenses" on public.local_expenses for select to authenticated using (true);
drop policy if exists "team can create expenses" on public.local_expenses;
create policy "team can create expenses" on public.local_expenses for insert to authenticated with check (recorded_by = auth.uid());
drop policy if exists "team can update expenses" on public.local_expenses;
create policy "team can update expenses" on public.local_expenses for update to authenticated using (true) with check (true);

drop policy if exists "team can read production" on public.production_updates;
create policy "team can read production" on public.production_updates for select to authenticated using (true);
drop policy if exists "team can create production" on public.production_updates;
create policy "team can create production" on public.production_updates for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "team can read documents" on public.documents;
create policy "team can read documents" on public.documents for select to authenticated using (true);
drop policy if exists "team can create documents" on public.documents;
create policy "team can create documents" on public.documents for insert to authenticated with check (uploaded_by = auth.uid());

drop policy if exists "team can read activity" on public.activity_log;
create policy "team can read activity" on public.activity_log for select to authenticated using (true);
drop policy if exists "team can add own activity" on public.activity_log;
create policy "team can add own activity" on public.activity_log for insert to authenticated with check (actor_id = auth.uid());

-- Accounts security is enforced in the database, not just hidden in the UI.
drop policy if exists "accounts managers can read ledger" on public.accounts_ledger;
create policy "accounts managers can read ledger" on public.accounts_ledger for select to authenticated using (public.is_accounts_manager());
drop policy if exists "accounts managers can create ledger" on public.accounts_ledger;
create policy "accounts managers can create ledger" on public.accounts_ledger for insert to authenticated with check (public.is_accounts_manager() and recorded_by = auth.uid());
drop policy if exists "accounts managers can amend ledger" on public.accounts_ledger;
create policy "accounts managers can amend ledger" on public.accounts_ledger for update to authenticated using (public.is_accounts_manager()) with check (public.is_accounts_manager() and amended_by = auth.uid());

-- Private shared file bucket for factory PIs, invoices, payment proofs,
-- production photos and order documents. Authenticated team members can view it.
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-files', 'order-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "team can view order files" on storage.objects;
create policy "team can view order files" on storage.objects
  for select to authenticated using (bucket_id = 'order-files');
drop policy if exists "team can upload order files" on storage.objects;
create policy "team can upload order files" on storage.objects
  for insert to authenticated with check (bucket_id = 'order-files');
drop policy if exists "team can update order files" on storage.objects;
create policy "team can update order files" on storage.objects
  for update to authenticated using (bucket_id = 'order-files') with check (bucket_id = 'order-files');

-- After creating the five users in Authentication > Users, set their roles.
-- Replace the sample emails below with the real login emails and run each line.
-- update public.profiles set full_name = 'Jimmy', role = 'director' where id = (select id from auth.users where email = 'jimmy@example.com');
-- update public.profiles set full_name = 'Hemansh', role = 'administrator' where id = (select id from auth.users where email = 'hemansh@example.com');
-- update public.profiles set full_name = 'Max', role = 'inquiry_lead' where id = (select id from auth.users where email = 'max@example.com');
-- update public.profiles set full_name = 'Laura', role = 'coordinator' where id = (select id from auth.users where email = 'laura@example.com');
-- update public.profiles set full_name = 'Apex', role = 'assistant' where id = (select id from auth.users where email = 'apex@example.com');
