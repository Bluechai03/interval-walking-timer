-- A profile is the name other people in a room see. Emails are never stored here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 2 and 16 and display_name = btrim(display_name)),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- For now a person can only see and change their own profile. Room members
-- will be allowed to read each other's names when rooms arrive.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "create own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy "change own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
