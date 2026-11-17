-- Access rules and behaviour of rooms. Each check raises an error if broken.
-- Run with scripts/test-db.sh. Everything rolls back at the end.
begin;

-- Twelve people: u01 is the host in most checks.
insert into auth.users (id)
select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 12) i;

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
-- Runs some SQL as the current person and checks it fails with the given text.
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
  room_a uuid; code_a text;
  room_b uuid; code_b text;
  n int;
  other uuid;
begin
  ---------------------------------------------------------------- creating
  perform pg_temp.become(1);
  select r.room_id, r.code into room_a, code_a from public.create_room(180, 180, 5, 5, 'Anna') r;
  if code_a !~ '^[BCDFGHJKLMNPQRSTVWXZ]{4}$' then raise exception 'FAIL: bad code %', code_a; end if;
  select count(*) into n from public.room_members where room_id = room_a;
  if n <> 1 then raise exception 'FAIL: the host is not a member'; end if;

  perform pg_temp.fails('select * from public.create_room(10, 180, 5, 5, ''Anna2'')', 'check');
  perform pg_temp.fails('select * from public.create_room(180, 180, 21, 5, ''Anna2'')', 'check');
  perform pg_temp.fails('select * from public.create_room(180, 180, 5, 31, ''Anna2'')', 'check');
  perform pg_temp.fails('select * from public.create_room(180, 180, 5, 5, ''A'')', 'check');

  ---------------------------------------------------------------- joining
  perform pg_temp.become(2);
  if public.join_room(lower(code_a), 'Ben') <> room_a then raise exception 'FAIL: join by lowercase code'; end if;
  if public.join_room(' ' || code_a || ' ', 'Whatever') <> room_a then raise exception 'FAIL: rejoin'; end if;
  select count(*) into n from public.room_members where room_id = room_a;
  if n <> 2 then raise exception 'FAIL: rejoining added a second row (%)', n; end if;
  select nickname into strict code_b from public.room_members where room_id = room_a and user_id = pg_temp.u(2);
  if code_b <> 'Ben' then raise exception 'FAIL: rejoining changed the name'; end if;

  perform pg_temp.become(3);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, 'BEN'), 'name_taken');
  perform pg_temp.fails('select public.join_room(''ZZZZ'', ''Cara'')', 'room_not_found');
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, ' Cara'), 'check');

  ---------------------------------------------------------------- who can read
  perform pg_temp.become(9);
  select count(*) into n from public.rooms;
  if n <> 0 then raise exception 'FAIL: a stranger can see rooms'; end if;
  select count(*) into n from public.room_members;
  if n <> 0 then raise exception 'FAIL: a stranger can see members'; end if;

  perform pg_temp.become(2);
  select count(*) into n from public.rooms where id = room_a;
  if n <> 1 then raise exception 'FAIL: a member cannot see their room'; end if;
  select count(*) into n from public.room_members where room_id = room_a;
  if n <> 2 then raise exception 'FAIL: a member cannot see the members'; end if;

  perform pg_temp.become_stranger();
  perform pg_temp.fails('select * from public.rooms', 'permission denied');
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, 'Eve'), 'permission denied');
  perform pg_temp.fails('select * from public.create_room(180, 180, 5, 5, ''Eve'')', 'permission denied');

  ---------------------------------------------------------------- no direct writes
  perform pg_temp.become(2);
  perform pg_temp.fails('update public.room_members set nickname = ''Hacked''', 'permission denied');
  perform pg_temp.fails('delete from public.rooms', 'permission denied');
  perform pg_temp.fails(format('insert into public.room_members (room_id, user_id, nickname) values (%L, %L, %L)', room_a, pg_temp.u(9), 'Sneaky'), 'permission denied');

  ---------------------------------------------------------------- removing
  perform pg_temp.fails(format('select public.remove_member(%L, %L)', room_a, pg_temp.u(1)), 'not_host');
  perform pg_temp.become(9);
  perform pg_temp.fails(format('select public.remove_member(%L, %L)', room_a, pg_temp.u(2)), 'not_host');

  perform pg_temp.become(1);
  perform pg_temp.fails(format('select public.remove_member(%L, %L)', room_a, pg_temp.u(1)), 'cannot_remove_self');
  perform public.remove_member(room_a, pg_temp.u(2));
  select count(*) into n from public.room_members where room_id = room_a and not removed;
  if n <> 1 then raise exception 'FAIL: removal did not take effect'; end if;

  perform pg_temp.become(2);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, 'Ben'), 'removed');
  select count(*) into n from public.rooms;
  if n <> 0 then raise exception 'FAIL: a removed person still sees the room'; end if;

  ---------------------------------------------------------------- leaving and touching
  perform pg_temp.become(3);
  perform public.join_room(code_a, 'Cara');
  perform pg_temp.admin();
  update public.room_members set last_seen_at = now() - interval '1 hour' where room_id = room_a;
  perform pg_temp.become(3);
  perform public.touch_room(room_a);
  perform pg_temp.admin();
  select count(*) into n from public.room_members where room_id = room_a and last_seen_at > now() - interval '1 minute';
  if n <> 1 then raise exception 'FAIL: touch should only update my own row (%)', n; end if;
  perform pg_temp.become(3);
  perform public.leave_room(room_a);
  perform pg_temp.admin();
  select count(*) into n from public.room_members where room_id = room_a and user_id = pg_temp.u(3);
  if n <> 0 then raise exception 'FAIL: leaving did not remove the row'; end if;
  perform pg_temp.become(3);
  perform public.join_room(code_a, 'Cara Two');

  ---------------------------------------------------------------- a full room
  perform pg_temp.become(1);
  select r.room_id, r.code into room_b, code_b from public.create_room(60, 60, 1, 0, 'Host') r;
  for i in 2..8 loop
    perform pg_temp.become(i);
    perform public.join_room(code_b, 'Walker ' || i);
  end loop;
  perform pg_temp.become(9);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_b, 'Late'), 'room_full');
  -- someone who went quiet no longer takes a place
  perform pg_temp.admin();
  update public.room_members set last_seen_at = now() - interval '10 minutes'
  where room_id = room_b and user_id = pg_temp.u(8);
  perform pg_temp.become(9);
  perform public.join_room(code_b, 'Late');

  ---------------------------------------------------------------- closed and expired rooms
  perform pg_temp.admin();
  update public.rooms set status = 'closed' where id = room_b;
  perform pg_temp.become(10);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_b, 'Zed'), 'room_not_found');
  perform pg_temp.admin();
  update public.rooms set closes_at = now() - interval '1 minute' where id = room_a;
  perform pg_temp.become(10);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, 'Zed'), 'room_not_found');

  ---------------------------------------------------------------- a code can be reused once closed
  perform pg_temp.admin();
  select count(*) into n from public.rooms where code = code_b and status <> 'closed';
  if n <> 0 then raise exception 'FAIL: closed rooms should free their code'; end if;

  raise notice 'rooms: all rules hold';
end $$;

rollback;
