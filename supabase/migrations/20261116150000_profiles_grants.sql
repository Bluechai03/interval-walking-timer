-- New Supabase projects don't let signed-in people touch a table until it is
-- granted. Guests count as signed in, so this covers them too. Nobody who isn't
-- signed in (anon) gets access, and nobody can delete a profile directly.
grant select, insert, update on public.profiles to authenticated;
