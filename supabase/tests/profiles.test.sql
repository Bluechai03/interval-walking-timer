-- Access rules on profiles. Each check raises an error if the rule is broken;
-- run them with scripts/test-db.sh. Everything rolls back at the end.
begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');

-- Pretend to be a signed-in person, the way the API does for each request.
create function pg_temp.become(uid uuid) returns void language plpgsql as $$
begin
  -- Both settings: the plain Postgres image reads the old one, Supabase the JSON.
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.become_stranger() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('role', 'anon', true);
end $$;
create function pg_temp.back_to_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'supabase_admin', true);
end $$;

do $$
declare
  anna constant uuid := '00000000-0000-0000-0000-00000000000a';
  ben  constant uuid := '00000000-0000-0000-0000-00000000000b';
  cara constant uuid := '00000000-0000-0000-0000-00000000000c';
  n int;
  rejected boolean;
begin
  -- a person can create and read their own profile
  perform pg_temp.become(anna);
  insert into public.profiles (id, display_name) values (anna, 'Anna');
  select count(*) into n from public.profiles where id = anna;
  if n <> 1 then raise exception 'FAIL: cannot read own profile'; end if;

  -- and change their own name
  update public.profiles set display_name = 'Anna M' where id = anna;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: cannot change own name'; end if;

  -- another person cannot see it
  perform pg_temp.become(ben);
  insert into public.profiles (id, display_name) values (ben, 'Ben');
  select count(*) into n from public.profiles where id = anna;
  if n <> 0 then raise exception 'FAIL: read someone else''s profile'; end if;

  -- cannot change someone else's name
  update public.profiles set display_name = 'Hacked' where id = anna;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: changed someone else''s name'; end if;

  -- cannot create a profile for someone else
  perform pg_temp.become(cara);
  rejected := false;
  begin
    insert into public.profiles (id, display_name) values (anna, 'Imposter');
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: created a profile for someone else'; end if;

  -- cannot change an owner by editing the id
  rejected := false;
  insert into public.profiles (id, display_name) values (cara, 'Cara');
  begin
    update public.profiles set id = ben where id = cara;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: reassigned a profile'; end if;
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- someone who isn't signed in sees and does nothing
  perform pg_temp.become_stranger();
  rejected := false;
  begin
    select count(*) into n from public.profiles;
    if n <> 0 then raise exception 'FAIL: stranger read profiles'; end if;
  exception when insufficient_privilege then rejected := true;
  end;

  -- names that break the length or trim rules are refused
  perform pg_temp.become(ben);
  begin update public.profiles set display_name = 'B' where id = ben;
    raise exception 'FAIL: one-letter name accepted';
  exception when check_violation then null; end;
  begin update public.profiles set display_name = repeat('b', 17) where id = ben;
    raise exception 'FAIL: 17-letter name accepted';
  exception when check_violation then null; end;
  begin update public.profiles set display_name = ' Ben ' where id = ben;
    raise exception 'FAIL: untrimmed name accepted';
  exception when check_violation then null; end;

  perform pg_temp.back_to_admin();
  raise notice 'profiles: all access rules hold';
end $$;

rollback;
