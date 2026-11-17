-- Starting a walk together. Run with scripts/test-db.sh; rolls back at the end.
begin;

insert into auth.users (id)
select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 5) i;

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
  room_id uuid; code text; begins timestamptz; t timestamptz; r public.rooms; n int;
begin
  perform pg_temp.become(1);
  select c.room_id, c.code into room_id, code from public.create_room(180, 120, 4, 7, 'Host') c;
  perform pg_temp.become(2);
  perform public.join_room(code, 'Ben');

  ---------------------------------------------------------------- only the host starts
  perform pg_temp.fails(format('select public.start_room(%L)', room_id), 'not_host');
  perform pg_temp.become(3);
  perform pg_temp.fails(format('select public.start_room(%L)', room_id), 'not_host');
  perform pg_temp.become_stranger();
  perform pg_temp.fails(format('select public.start_room(%L)', room_id), 'permission denied');

  ---------------------------------------------------------------- the start moment
  perform pg_temp.become(1);
  begins := public.start_room(room_id);
  if begins < clock_timestamp() + interval '6 seconds' or begins > clock_timestamp() + interval '8 seconds' then
    raise exception 'FAIL: the walk should begin get_ready (7) seconds from now, got %', begins - clock_timestamp();
  end if;
  select * into r from public.rooms where id = room_id;
  if r.status <> 'walking' or r.start_at <> begins then raise exception 'FAIL: room not marked as walking'; end if;
  -- the room stays open an hour past the end of the walk: 4 rounds of 5 minutes
  if r.closes_at < begins + interval '20 minutes' + interval '59 minutes' then
    raise exception 'FAIL: the room would close too soon (%)', r.closes_at;
  end if;

  ---------------------------------------------------------------- only once
  perform pg_temp.fails(format('select public.start_room(%L)', room_id), 'already_started');

  ---------------------------------------------------------------- members see it, late joiners join in
  perform pg_temp.become(2);
  select count(*) into n from public.rooms where id = room_id and start_at = begins;
  if n <> 1 then raise exception 'FAIL: a member cannot see the start time'; end if;
  perform pg_temp.become(3);
  perform public.join_room(code, 'Late Cara');
  select count(*) into n from public.rooms where id = room_id and start_at = begins;
  if n <> 1 then raise exception 'FAIL: a late joiner cannot see the start time'; end if;

  ---------------------------------------------------------------- a removed person cannot start or see it
  perform pg_temp.become(1);
  perform public.remove_member(room_id, pg_temp.u(2));
  perform pg_temp.become(2);
  select count(*) into n from public.rooms;
  if n <> 0 then raise exception 'FAIL: a removed person still sees the walk'; end if;

  ---------------------------------------------------------------- a host who has left cannot start (the room closed)
  perform pg_temp.become(4);
  select c.room_id, c.code into room_id, code from public.create_room(60, 60, 1, 0, 'Solo') c;
  perform public.leave_room(room_id);
  perform pg_temp.fails(format('select public.start_room(%L)', room_id), 'room_not_found');

  ---------------------------------------------------------------- a walk with no countdown
  perform pg_temp.become(5);
  select c.room_id into room_id from public.create_room(60, 60, 1, 0, 'Quick') c;
  begins := public.start_room(room_id);
  if begins > clock_timestamp() + interval '1 second' then raise exception 'FAIL: no countdown should begin at once'; end if;

  ---------------------------------------------------------------- the server clock
  perform pg_temp.become(5);
  t := public.server_time();
  if abs(extract(epoch from (t - clock_timestamp()))) > 2 then raise exception 'FAIL: server_time is off'; end if;
  perform pg_temp.become_stranger();
  perform pg_temp.fails('select public.server_time()', 'permission denied');

  raise notice 'start_room: all rules hold';
end $$;

rollback;
