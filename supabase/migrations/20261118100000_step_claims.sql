-- Reading steps from Apple Health. The app can't read Health, but the walker's
-- Shortcut can. So the app makes a one-time claim, hands its code to the Shortcut,
-- and the Shortcut posts the step count straight back to this database. No
-- trip through a browser is needed, so it works from the Home Screen app.

create table public.step_claims (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{10}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The stretch of time to add up steps for.
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at and ends_at - starts_at <= interval '12 hours'),
  steps int check (steps between 0 and 200000),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index step_claims_owner on public.step_claims (user_id, created_at);

alter table public.step_claims enable row level security;

-- A person reads only their own claims. Nobody writes to the table directly.
create policy "read own step claims" on public.step_claims
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.step_claims to authenticated;

-- The app asks for a code. A person can make 20 an hour, which is far more than
-- real use needs, so a stuck loop can't fill the table.
create function public.create_step_claim(starts timestamptz, ends timestamptz) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  letters constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from public.step_claims c
      where c.user_id = uid and c.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_claims';
  end if;
  -- Old claims are of no use to anyone.
  delete from public.step_claims c where c.user_id = uid and c.created_at < now() - interval '1 day';
  loop
    new_code := '';
    for i in 1..10 loop
      new_code := new_code || substr(letters, 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into public.step_claims (code, user_id, starts_at, ends_at) values (new_code, uid, starts, ends);
      return new_code;
    exception when unique_violation then
      null; -- a code that already exists: try another
    end;
  end loop;
end $$;

-- The Shortcut calls this with the code it was given. It has no account, so it
-- can be called by anyone, but it can only fill in a claim that is still empty
-- and under 30 minutes old. The code is ten characters from a set of 32.
create function public.submit_steps(claim_code text, step_count int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.step_claims c
  set steps = step_count, submitted_at = now()
  where c.code = upper(btrim(claim_code))
    and c.steps is null
    and c.created_at > now() - interval '30 minutes';
  if not found then raise exception 'claim_not_found'; end if;
end $$;

-- Only a signed-in person can ask for a code. Anyone holding a code can use it.
revoke execute on function public.create_step_claim(timestamptz, timestamptz) from public, anon;
grant execute on function public.create_step_claim(timestamptz, timestamptz) to authenticated;
revoke execute on function public.submit_steps(text, int) from public;
grant execute on function public.submit_steps(text, int) to anon, authenticated;
