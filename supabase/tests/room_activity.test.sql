-- A room's activity. Run with scripts/test-db.sh; rolls back at the end.
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
  room_a uuid; code_a text; room_b uuid; room_c uuid; got text;
begin
  perform pg_temp.become(1);

  -- the host's choice is kept, and members read it
  select c.room_id, c.code into room_a, code_a from public.create_room(180, 180, 5, 10, 'Anna', 'elliptical') c;
  select activity into got from public.rooms where id = room_a;
  if got <> 'elliptical' then raise exception 'FAIL: the activity was not kept (%)', got; end if;
  perform pg_temp.become(2);
  perform public.join_room(code_a, 'Ben');
  select activity into got from public.rooms where id = room_a;
  if got <> 'elliptical' then raise exception 'FAIL: a member cannot read the activity'; end if;

  -- walking when nothing is said, as before
  perform pg_temp.become(1);
  select c.room_id into room_b from public.create_room(180, 180, 5, 10, 'Anna2') c;
  select activity into got from public.rooms where id = room_b;
  if got <> 'walk' then raise exception 'FAIL: the default should be walk (%)', got; end if;

  -- every activity the app offers is accepted
  select c.room_id into room_c from public.create_room(60, 60, 1, 10, 'Bikey', 'bike') c;

  -- anything else is refused
  perform pg_temp.fails($f$select * from public.create_room(60, 60, 1, 10, 'Swim', 'swimming')$f$, 'check');
  perform pg_temp.fails($f$select * from public.create_room(60, 60, 1, 10, 'Runny', 'run')$f$, 'check');
  perform pg_temp.fails($f$select * from public.create_room(60, 60, 1, 10, 'Blank', '')$f$, 'check');

  -- nobody can change it afterwards
  perform pg_temp.fails(format('update public.rooms set activity = %L where id = %L', 'bike', room_a), 'permission denied');

  -- and a signed-out person still can't make a room
  perform pg_temp.become_stranger();
  perform pg_temp.fails($f$select * from public.create_room(60, 60, 1, 10, 'Eve', 'walk')$f$, 'permission denied');

  raise notice 'room activity: all rules hold';
end $$;

rollback;
