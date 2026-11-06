# Strut

A phone-first Japanese interval walking timer that walks with you: strut fast, ease off slow, classically 3 minutes each for 5 rounds.

**Live:** [interval-walking-timer.vercel.app](https://interval-walking-timer.vercel.app)

## What it does

- Fills the screen with the current phase, with a countdown readable at arm's length mid-stride.
- Plays an audio cue at each phase change and when the walk ends.
- Keeps the screen awake while a walk is running.
- Shows the target heart rate for each phase (currently set for age 23).
- Lets you change the plan (fast and slow minutes, number of rounds); it's saved on your device.
- Installs as an app on your home screen (PWA).

Next up: live cadence (steps per minute) from your phone's motion sensors.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, Vitest. Deployed on Vercel.

## Develop

```bash
pnpm install
pnpm dev       # http://localhost:3000
pnpm test      # timer, plan and cue logic
pnpm lint
```

The walk logic lives in `src/lib` and is covered by tests. `src/app` holds the screens. Terms like plan, phase, round and walk are defined in [`GLOSSARY.md`](./GLOSSARY.md).

## Real-walk log

Each real walk with the app is recorded in [`docs/walk-log.md`](./docs/walk-log.md), with links to the issues it found.
