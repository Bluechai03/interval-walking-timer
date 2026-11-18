-- Delete my data. Run with scripts/test-db.sh; rolls back at the end.
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
  raise exception 'FAIL: no error (expected "%") for: %', expected, sqlerrm;
end $$;

do $$
declare
  mine uuid; mine_code text; theirs uuid; theirs_code text; n int;
begin
  -- person 1 has a name, hosts a room with person 2 in it, and is in person 3's room
  perform pg_temp.become(1);
  insert into public.profiles (id, display_name) values (pg_temp.u(1), 'Anna');
  select c.room_id, c.code into mine, mine_code from public.create_room(60, 60, 1, 0, 'Anna') c;
  perform pg_temp.become(2);
  insert into public.profiles (id, display_name) values (pg_temp.u(2), 'Ben');
  perform public.join_room(mine_code, 'Ben');
  perform pg_temp.become(3);
  insert into public.profiles (id, display_name) values (pg_temp.u(3), 'Cara');
  select c.room_id, c.code into theirs, theirs_code from public.create_room(60, 60, 1, 0, 'Cara') c;
  perform pg_temp.become(1);
  perform public.join_room(theirs_code, 'Anna');

  ---------------------------------------------------------------- not signed in
  perform pg_temp.become_stranger();
  perform pg_temp.fails('select public.delete_my_data()', 'permission denied');

  ---------------------------------------------------------------- person 1 deletes their data
  perform pg_temp.become(1);
  perform public.delete_my_data();
  perform pg_temp.admin();

  select count(*) into n from auth.users where id = pg_temp.u(1);
  if n <> 0 then raise exception 'FAIL: the account is still there'; end if;
  select count(*) into n from public.profiles where id = pg_temp.u(1);
  if n <> 0 then raise exception 'FAIL: the name is still there'; end if;
  select count(*) into n from public.room_members where user_id = pg_temp.u(1);
  if n <> 0 then raise exception 'FAIL: room memberships are still there'; end if;
  select count(*) into n from public.rooms where id = mine;
  if n <> 0 then raise exception 'FAIL: the room they started is still there'; end if;
  select count(*) into n from public.room_members where room_id = mine;
  if n <> 0 then raise exception 'FAIL: other people are still in a room that no longer exists'; end if;

  ---------------------------------------------------------------- nobody else loses anything
  select count(*) into n from auth.users where id in (pg_temp.u(2), pg_temp.u(3));
  if n <> 2 then raise exception 'FAIL: someone else''s account went too'; end if;
  select count(*) into n from public.profiles where id in (pg_temp.u(2), pg_temp.u(3));
  if n <> 2 then raise exception 'FAIL: someone else''s name went too'; end if;
  select count(*) into n from public.rooms where id = theirs;
  if n <> 1 then raise exception 'FAIL: someone else''s room went too'; end if;
  select count(*) into n from public.room_members where room_id = theirs;
  if n <> 1 then raise exception 'FAIL: the room''s own host should remain (and only them)'; end if;

  ---------------------------------------------------------------- asking twice is harmless
  perform pg_temp.become(1);
  perform public.delete_my_data();

  raise notice 'delete my data: all rules hold';
end $$;

rollback;
