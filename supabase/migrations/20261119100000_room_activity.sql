-- A room has an activity, chosen by the host, so everyone in it reads the same
-- words (Walk fast, or Push harder on the elliptical). It only changes wording.
alter table public.rooms
  add column activity text not null default 'walk'
  check (activity in ('walk', 'elliptical', 'bike'));

-- Replaces create_room with one that takes the activity. The old five-argument
-- version is dropped so there is only one to choose from.
drop function public.create_room(int, int, int, int, text);

create function public.create_room(
  fast int, slow int, total_rounds int, get_ready int, nickname text, room_activity text default 'walk'
) returns table (room_id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  letters constant text := 'BCDFGHJKLMNPQRSTVWXZ';
  new_code text;
  new_id uuid;
  tries int := 0;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  update public.rooms r set status = 'closed' where r.status <> 'closed' and r.closes_at <= now();
  loop
    new_code := '';
    for i in 1..4 loop
      new_code := new_code || substr(letters, 1 + floor(random() * 20)::int, 1);
    end loop;
    begin
      insert into public.rooms (code, host_id, fast_seconds, slow_seconds, rounds, get_ready_seconds, activity)
      values (new_code, uid, fast, slow, total_rounds, get_ready, room_activity)
      returning id into new_id;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise exception 'try_again'; end if;
    end;
  end loop;
  insert into public.room_members (room_id, user_id, nickname) values (new_id, uid, nickname);
  return query select new_id, new_code;
end $$;

revoke execute on function public.create_room(int, int, int, int, text, text) from public, anon;
grant execute on function public.create_room(int, int, int, int, text, text) to authenticated;
