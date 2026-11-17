-- Starting a walk together. The host's tap fixes one moment on the server's
-- clock, and every phone counts towards it, so they begin on the same beat
-- whatever their own clocks say.

-- Phones read the server's time to work out how far off their own clock is.
create function public.server_time() returns timestamptz
language sql stable set search_path = '' as $$
  select clock_timestamp();
$$;

create function public.start_room(room uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.rooms;
  begins timestamptz;
begin
  select * into r from public.rooms where id = room for update;
  if not found or r.host_id is distinct from uid then raise exception 'not_host'; end if;
  if r.status = 'closed' or r.closes_at <= now() then raise exception 'room_not_found'; end if;
  if r.status <> 'open' then raise exception 'already_started'; end if;
  if not exists (
    select 1 from public.room_members m
    where m.room_id = room and m.user_id = uid and not m.removed
  ) then raise exception 'not_host'; end if;

  -- The countdown runs up to this moment; the first phase begins at it.
  begins := clock_timestamp() + r.get_ready_seconds * interval '1 second';
  update public.rooms
  set status = 'walking',
      start_at = begins,
      -- The room stays open for an hour after the walk ends.
      closes_at = greatest(
        closes_at,
        begins + (r.rounds * (r.fast_seconds + r.slow_seconds)) * interval '1 second' + interval '1 hour'
      )
  where id = room;
  return begins;
end $$;

revoke execute on function public.server_time(), public.start_room(uuid) from public, anon;
grant execute on function public.server_time(), public.start_room(uuid) to authenticated;
