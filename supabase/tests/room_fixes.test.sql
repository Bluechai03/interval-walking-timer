-- Fixes found in review: removed people, the host leaving, the 8-person limit,
-- clean names, and freeing old rooms. Run with scripts/test-db.sh.
begin;

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
  room_a uuid; code_a text; room_b uuid; code_b text; room_c uuid; code_c text; n int; status_now text;
begin
  ---------------------------------------------------------------- a removed person cannot leave and slip back in
  perform pg_temp.become(1);
  select c.room_id, c.code into room_a, code_a from public.create_room(60, 60, 2, 5, 'Host') c;
  perform pg_temp.become(2);
  perform public.join_room(code_a, 'Ben');
  perform pg_temp.become(1);
  perform public.remove_member(room_a, pg_temp.u(2));
  perform pg_temp.become(2);
  perform public.leave_room(room_a);
  perform pg_temp.admin();
  select count(*) into n from public.room_members where room_id = room_a and user_id = pg_temp.u(2) and removed;
  if n <> 1 then raise exception 'FAIL: leaving erased the removed mark'; end if;
  perform pg_temp.become(2);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, 'Ben'), 'removed');
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_a, 'Ben Again'), 'removed');

  ---------------------------------------------------------------- the host leaving before the walk closes the room
  perform pg_temp.become(3);
  select c.room_id, c.code into room_b, code_b from public.create_room(60, 60, 1, 5, 'Hostess') c;
  perform pg_temp.become(4);
  perform public.join_room(code_b, 'Dan');
  perform pg_temp.become(3);
  perform public.leave_room(room_b);
  perform pg_temp.admin();
  select r.status into status_now from public.rooms r where r.id = room_b;
  if status_now <> 'closed' then raise exception 'FAIL: the room should close when its host leaves before the start'; end if;
  perform pg_temp.become(5);
  perform pg_temp.fails(format('select public.join_room(%L, %L)', code_b, 'Eve'), 'room_not_found');
  -- the guest still reads the room and sees that it closed
  perform pg_temp.become(4);
  select count(*) into n from public.rooms where id = room_b and status = 'closed';
  if n <> 1 then raise exception 'FAIL: a guest should see that the room closed'; end if;

  ---------------------------------------------------------------- the host leaving mid-walk does not stop it
  perform pg_temp.become(6);
  select c.room_id, c.code into room_c, code_c from public.create_room(60, 60, 1, 0, 'Walker') c;
  perform pg_temp.become(7);
  perform public.join_room(code_c, 'Gus');
  perform pg_temp.become(6);
  perform public.start_room(room_c);
  perform public.leave_room(room_c);
  perform pg_temp.admin();
  select r.status into status_now from public.rooms r where r.id = room_c;
  if status_now <> 'walking' then raise exception 'FAIL: the walk should carry on after the host leaves'; end if;
  perform pg_temp.become(7);
  select count(*) into n from public.rooms where id = room_c and status = 'walking';
  if n <> 1 then raise exception 'FAIL: a guest should still be in the walking room'; end if;
  -- and someone can still join late
  perform pg_temp.become(8);
  perform public.join_room(code_c, 'Late Hal');

  ---------------------------------------------------------------- names with control characters are refused
  perform pg_temp.become(9);
  perform pg_temp.fails(format('insert into public.profiles (id, display_name) values (%L, %L)', pg_temp.u(9), 'Ann' || chr(7) || 'a'), 'check');
  perform pg_temp.fails(format('select * from public.create_room(60, 60, 1, 0, %L)', 'Bad' || chr(10) || 'Name'), 'check');

  ---------------------------------------------------------------- old rooms are closed, which frees their codes
  perform pg_temp.admin();
  insert into public.rooms (code, host_id, fast_seconds, slow_seconds, rounds, get_ready_seconds, closes_at)
  values ('BBBB', pg_temp.u(10), 60, 60, 1, 0, now() - interval '1 hour');
  perform pg_temp.become(11);
  perform public.create_room(60, 60, 1, 0, 'Newcomer');
  perform pg_temp.admin();
  select r.status into status_now from public.rooms r where r.code = 'BBBB';
  if status_now <> 'closed' then raise exception 'FAIL: an expired room should be marked closed'; end if;

  raise notice 'room fixes: all rules hold';
end $$;

rollback;
