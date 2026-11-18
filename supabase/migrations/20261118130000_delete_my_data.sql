-- "Delete my data": removes the caller's account. Everything that belongs to it
-- goes with it, because those tables point at the account and cascade: their
-- name, their place in every room, and any rooms they started (which closes
-- them for everyone in them).
create function public.delete_my_data() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
