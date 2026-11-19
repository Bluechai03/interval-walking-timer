# Strut

A phone-first Japanese interval walking timer that walks with you: strut fast, ease off slow, classically 3 minutes each for 5 rounds.

**Live:** [strutwalk.vercel.app](https://strutwalk.vercel.app)

## What it does

- Fills the screen with the current phase, with a countdown readable at arm's length mid-stride.
- Plays an audio cue at each phase change and when the walk ends.
- Keeps the screen awake while a walk is running.
- Shows the target heart rate for each phase (currently set for age 23).
- Lets you change the plan (fast and slow minutes, number of rounds) and the activity (walk, elliptical or bike, which changes the words); it's saved on your device.
- Counts you in before the walk starts, 5 seconds by default (change it with Get ready in the plan, or set 0 for none).
- Installs as an app on your home screen (PWA).

## Apple Watch workout (iPhone)

Strut can start a workout on your Apple Watch when you tap Start, and end it when the walk finishes. It does this by running Shortcuts you make once, so turn on **Start my Watch too** in the app and follow [`docs/watch-workout.md`](./docs/watch-workout.md). The walk begins when the Watch workout does. Pause only pauses the timer, because Shortcuts can't pause a workout.

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
