# Rooms live inside Strut and run on Supabase

Walking with friends is built into the existing Strut app, under `/friends`, in the same repo and on the same site. It is not a separate app. The solo timer at `/` stays exactly as it is and never needs an account.

## Decisions

- **One app.** Rooms are a second way to use Strut. The solo timer must keep working with no account and no network.
- **Supabase and Vercel, free tiers only.** Supabase gives sign-in, a Postgres database with row-level security, and realtime. A scheduled GitHub Actions ping keeps the free project from pausing. Nothing paid.
- **Google sign-in for hosts.** Only signed-in people host. Apple sign-in is out, because it needs a paid developer account. Email links are a backup only if the built-in sender proves to work.
- **Guests use anonymous sign-in.** A guest joins with a join code and a nickname and gets a real account with no name, so the same access rules apply to everyone. A guest who later signs in keeps their walks.
- **Everyone follows one clock.** The host's start time is a server timestamp, and each phone works out its offset from the server. Late joiners join mid-walk. Each phone follows the start time, so the walk continues if the host leaves. There is no shared pause.
- **Steps come from Health through a Shortcut**, when a walk ends, not from the phone's motion sensor. A motion-sensor count was rejected: it only works with the screen on and is rough. Steps are visible to room members only, and a member can hide theirs.
- **Tests run against a local Supabase in Docker.** This keeps CI free and secret-free.

## Consequences

- The timer code and the room code share one repo, so the timer's tests keep guarding the solo path.
- Anonymous sign-ins are open to abuse. There is no CAPTCHA at first; add one if guest sign-ins near a free limit.
- Whether the Health Shortcut's result returns on the walker's iOS version is unconfirmed. It is tested before steps are built.
