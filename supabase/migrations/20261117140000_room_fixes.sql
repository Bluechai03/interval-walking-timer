-- Fixes found in review of rooms.

-- Names can't carry control characters, whatever calls the database.
alter table public.profiles
  add constraint profiles_display_name_clean check (display_name !~ '[[:cntrl:]]');
alter table public.room_members
  add constraint room_members_nickname_clean check (nickname !~ '[[:cntrl:]]');

-- Leaving: a removed person stays marked as removed, so they can't leave and slip
-- back in. A host who leaves before the walk starts closes the room, because
-- nobody else could ever start it. Once the walk is going it carries on without them.
create or replace function public.leave_room(room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  found_room public.rooms;
begin
  select * into found_room from public.rooms r where r.id = room for update;
  if not found then return; end if;
  delete from public.room_members where room_id = room and user_id = uid and not removed;
  if found_room.host_id = uid and found_room.status = 'open' then
    update public.rooms set status = 'closed' where id = room;
  end if;
end $$;

-- Joining: the 8-person limit counts everyone who hasn't been removed, even if
-- their phone is asleep. A walker with a locked screen still has their place.
-- (The host can remove someone who has gone for good.)
create or replace function public.join_room(room_code text, nickname text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  found_room public.rooms;
  existing public.room_members;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into found_room from public.rooms r
  where r.code = upper(btrim(room_code)) and r.status <> 'closed' and r.closes_at > now();
  if not found then raise exception 'room_not_found'; end if;

  select * into existing from public.room_members m
  where m.room_id = found_room.id and m.user_id = uid;
  if found then
    if existing.removed then raise exception 'removed'; end if;
    update public.room_members set last_seen_at = now()
    where room_id = found_room.id and user_id = uid;
    return found_room.id;
  end if;

  if (select count(*) from public.room_members m
      where m.room_id = found_room.id and not m.removed) >= 8 then
    raise exception 'room_full';
  end if;

  begin
    insert into public.room_members (room_id, user_id, nickname)
    values (found_room.id, uid, nickname);
  exception when unique_violation then
    raise exception 'name_taken';
  end;
  return found_room.id;
end $$;

-- Creating: rooms past their closing time are marked closed, which frees their
-- codes for reuse.
create or replace function public.create_room(
  fast int, slow int, total_rounds int, get_ready int, nickname text
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
      insert into public.rooms (code, host_id, fast_seconds, slow_seconds, rounds, get_ready_seconds)
      values (new_code, uid, fast, slow, total_rounds, get_ready)
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
