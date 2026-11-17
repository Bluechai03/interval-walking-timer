-- Step claims: who can make one, read one and fill one in. Run with scripts/test-db.sh.
begin;

insert into auth.users (id) select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 3) i;

create function pg_temp.u(n int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid
$$;
create function pg_temp.become(n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', pg_temp.u(n)::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.become_stranger() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('role', 'anon', true);
end $$;
create function pg_temp.admin() returns void language plpgsql as $$
begin perform set_config('role', 'supabase_admin', true); end $$;
create function pg_temp.fails(sql text, expected text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm not like '%' || expected || '%' then
      raise exception 'FAIL: expected "%" but got "%" for: %', expected, sqlerrm, sql;
    end if;
    return;
  end;
  raise exception 'FAIL: no error (expected "%") for: %', expected, sql;
end $$;

do $$
declare
  code_a text; code_b text; n int; got int;
begin
  ---------------------------------------------------------------- making a claim
  perform pg_temp.become(1);
  code_a := public.create_step_claim(now() - interval '40 minutes', now());
  if code_a !~ '^[A-HJ-NP-Z2-9]{10}$' then raise exception 'FAIL: bad code %', code_a; end if;

  perform pg_temp.fails($f$select public.create_step_claim(now(), now() - interval '1 hour')$f$, 'check');
  perform pg_temp.fails($f$select public.create_step_claim(now() - interval '13 hours', now())$f$, 'check');

  perform pg_temp.become_stranger();
  perform pg_temp.fails($f$select public.create_step_claim(now() - interval '1 hour', now())$f$, 'permission denied');

  ---------------------------------------------------------------- who can read
  perform pg_temp.become(1);
  select count(*) into n from public.step_claims where code = code_a;
  if n <> 1 then raise exception 'FAIL: the owner cannot read their claim'; end if;
  perform pg_temp.become(2);
  select count(*) into n from public.step_claims;
  if n <> 0 then raise exception 'FAIL: someone else can read the claim'; end if;
  perform pg_temp.become_stranger();
  perform pg_temp.fails('select * from public.step_claims', 'permission denied');

  ---------------------------------------------------------------- no direct writes
  perform pg_temp.become(1);
  perform pg_temp.fails(format('update public.step_claims set steps = 99999 where code = %L', code_a), 'permission denied');
  perform pg_temp.fails(format('delete from public.step_claims where code = %L', code_a), 'permission denied');

  ---------------------------------------------------------------- the Shortcut fills it in, once
  perform pg_temp.become_stranger();
  perform public.submit_steps(lower(code_a), 4321);
  perform pg_temp.become(1);
  select steps into got from public.step_claims where code = code_a;
  if got <> 4321 then raise exception 'FAIL: steps not saved (got %)', got; end if;
  perform pg_temp.become_stranger();
  perform pg_temp.fails(format('select public.submit_steps(%L, 1)', code_a), 'claim_not_found');
  perform pg_temp.become(1);
  select steps into got from public.step_claims where code = code_a;
  if got <> 4321 then raise exception 'FAIL: a second submit changed the steps'; end if;

  ---------------------------------------------------------------- wrong codes and silly numbers
  perform pg_temp.become_stranger();
  perform pg_temp.fails($f$select public.submit_steps('AAAAAAAAAA', 10)$f$, 'claim_not_found');
  perform pg_temp.become(1);
  code_b := public.create_step_claim(now() - interval '1 hour', now());
  perform pg_temp.become_stranger();
  perform pg_temp.fails(format('select public.submit_steps(%L, -5)', code_b), 'check');
  perform pg_temp.fails(format('select public.submit_steps(%L, 999999)', code_b), 'check');

  ---------------------------------------------------------------- a claim goes stale
  perform pg_temp.admin();
  update public.step_claims set created_at = now() - interval '31 minutes' where code = code_b;
  perform pg_temp.become_stranger();
  perform pg_temp.fails(format('select public.submit_steps(%L, 100)', code_b), 'claim_not_found');

  ---------------------------------------------------------------- a stuck loop can't fill the table
  perform pg_temp.become(3);
  for i in 1..20 loop
    perform public.create_step_claim(now() - interval '1 hour', now());
  end loop;
  perform pg_temp.fails($f$select public.create_step_claim(now() - interval '1 hour', now())$f$, 'too_many_claims');

  raise notice 'step claims: all rules hold';
end $$;

rollback;
