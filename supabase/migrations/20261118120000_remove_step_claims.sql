-- The Health steps test is gone: reading steps through a hand-built Shortcut was
-- too much for people to set up. This removes what it added.
drop function if exists public.submit_steps(text, int);
drop function if exists public.create_step_claim(timestamptz, timestamptz);
drop table if exists public.step_claims;
