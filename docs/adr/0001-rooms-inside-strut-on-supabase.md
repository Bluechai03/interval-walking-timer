# Rooms live inside Strut and run on Supabase

Walking with friends is built into the existing Strut app, under `/friends`, in the same repo and on the same site. It is not a separate app. The solo timer at `/` stays exactly as it is and never needs an account.

## Decisions

- **One app.** Rooms are a second way to use Strut. The solo timer must keep working with no account and no network.
- **Supabase and Vercel, free tiers only.** Supabase gives sign-in, a Postgres database with row-level security, and realtime. A scheduled GitHub Actions ping keeps the free project from pausing. Nothing paid.
- **Everyone is a guest, with no sign-in.** A person picks a name, or joins with a join code and a nickname, and Supabase makes a real but nameless account for that browser (anonymous sign-in), so the same access rules apply to everyone. Anyone can host. A guest's name and history live in that browser, so clearing site data starts afresh.
- **Google sign-in is left out of the first version.** It puts a login on the path of someone joining a walk, can fail from an installed home-screen app on iPhone, and adds a second kind of member to build and test. It can come back later as an optional "keep my walks" upgrade, which Supabase supports without losing the guest's data. Apple sign-in is out, because it needs a paid developer account.
- **Everyone follows one clock.** The host's start time is a server timestamp, and each phone works out its offset from the server. Late joiners join mid-walk. Each phone follows the start time, so the walk continues if the host leaves. There is no shared pause.
- **Steps come from Health through a Shortcut**, when a walk ends, not from the phone's motion sensor. A motion-sensor count was rejected: it only works with the screen on and is rough. Steps are visible to room members only, and a member can hide theirs.
- **Tests run against a local Supabase in Docker.** This keeps CI free and secret-free.

## Consequences

- The timer's source and the rooms' source share one repo, so the timer's tests keep guarding the solo path.
- Anonymous sign-ins are open to abuse. There is no CAPTCHA at first; add one if guest sign-ins near a free limit.
- Without accounts, "My walks" and a name are per browser, and a lost browser is a lost history. The optional account upgrade is the answer if that matters.
- New Supabase projects do not grant tables to anyone by default, so every migration must grant what it needs. The database tests remove the default grants to match.
- Whether the Health Shortcut's result returns on the walker's iOS version is unconfirmed. It is tested before steps are built.
