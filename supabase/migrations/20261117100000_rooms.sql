-- Rooms: a shared walk. People can only read a room they are in, and all
-- changes go through the functions below, so the rules live in one place.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  -- Four consonants only: no look-alikes (O/0, I/1) and no accidental words.
  code text not null check (code ~ '^[BCDFGHJKLMNPQRSTVWXZ]{4}$'),
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'walking', 'closed')),
  fast_seconds int not null check (fast_seconds between 60 and 3600),
  slow_seconds int not null check (slow_seconds between 60 and 3600),
  rounds int not null check (rounds between 1 and 20),
  get_ready_seconds int not null check (get_ready_seconds between 0 and 30),
  start_at timestamptz,
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default now() + interval '6 hours'
);

-- A code is unique among rooms that are still going; closed rooms free theirs.
create unique index rooms_open_code on public.rooms (code) where status <> 'closed';

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null
    check (char_length(nickname) between 2 and 16 and nickname = btrim(nickname)),
  removed boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- One nickname per room, whatever its capitals.
create unique index room_members_nickname on public.room_members (room_id, lower(nickname));

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- Security definer so the policies can ask "am I in this room?" without
-- running into the room_members policy itself.
create function public.is_room_member(room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = room and m.user_id = (select auth.uid()) and not m.removed
  );
$$;

create policy "members read their room" on public.rooms
  for select to authenticated using (public.is_room_member(id));

create policy "members read their room's members" on public.room_members
  for select to authenticated using (public.is_room_member(room_id));

-- Read only. Nobody writes to these tables directly.
grant select on public.rooms, public.room_members to authenticated;
revoke execute on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

create function public.create_room(
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

create function public.join_room(room_code text, nickname text) returns uuid
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

  -- People who have gone quiet for a couple of minutes no longer take a place.
  if (select count(*) from public.room_members m
      where m.room_id = found_room.id and not m.removed
        and m.last_seen_at > now() - interval '2 minutes') >= 8 then
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

create function public.leave_room(room uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.room_members where room_id = room and user_id = (select auth.uid());
$$;

create function public.remove_member(room uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if not exists (select 1 from public.rooms r where r.id = room and r.host_id = uid) then
    raise exception 'not_host';
  end if;
  if member = uid then raise exception 'cannot_remove_self'; end if;
  update public.room_members set removed = true where room_id = room and user_id = member;
end $$;

-- Called every few seconds by each phone, so the others can tell who is here.
create function public.touch_room(room uuid) returns void
language sql security definer set search_path = '' as $$
  update public.room_members set last_seen_at = now()
  where room_id = room and user_id = (select auth.uid()) and not removed;
$$;

revoke execute on function
  public.create_room(int, int, int, int, text), public.join_room(text, text),
  public.leave_room(uuid), public.remove_member(uuid, uuid), public.touch_room(uuid)
from public, anon;
grant execute on function
  public.create_room(int, int, int, int, text), public.join_room(text, text),
  public.leave_room(uuid), public.remove_member(uuid, uuid), public.touch_room(uuid)
to authenticated;

-- Phones hear about changes to their room as they happen.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rooms, public.room_members;
  end if;
end $$;
