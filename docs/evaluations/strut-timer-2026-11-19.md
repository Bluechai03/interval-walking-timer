# Strut solo timer: UX and accessibility evaluation

Method: Intent's `evaluate` and `include` skills, applied by reading the code of the solo timer (`timer.tsx`, `walk-display.tsx`, `plan-settings.tsx`, `trail-profile.tsx`, `heart-rate.tsx`, `mute-button.tsx`, `phase-notifications.tsx`) on branch `redesign-1-workout`. This is a code review. Nobody has yet tried it with VoiceOver, a keyboard or Switch Control, so every accessibility finding below is a prediction to confirm, not a test result. Rooms (`/friends`) are not covered.

## Anti-pattern verdict

Clean. No nagging, no guilt copy, no hidden costs. Reminders are opt-in and the "Delete my data" button exists. Nothing here is manipulative.

## Priority issues

### Major

**A walker who can't see the screen is not told when the phase changes**
- **What happens:** The phase word and countdown change on screen, but there is no live region. The `role="timer"` label updates every second, which screen readers do not announce. The only change a blind walker would get is the spoken cue, and that stops when Sound is off or iOS locks audio ("Tap anywhere to turn sound on").
- **Why it matters:** The timer's whole job is "tell me when to change pace". With a screen reader and sound off, it does not.
- **Breaks:** Visibility of system status; WCAG 4.1.3 Status Messages.
- **Change:** One polite live region that announces only phase changes and the finish, never the per-second countdown.

**Plan fields ignore bad numbers without saying so**
- **What happens:** `plan-settings.tsx` applies a value only if it is valid. Type 99 rounds and nothing changes: no message, the Total stays the same, the box still shows 99.
- **Why it matters:** The walker thinks they set a plan and start a different one. Screen reader users get no hint at all.
- **Breaks:** Help users recognise and recover from errors; error prevention.
- **Change:** Say the allowed range beside each field and show a short message when the typed value is outside it.

### Minor

**Status messages are plain text, not announced**
- **What happens:** "Tap anywhere to turn sound on" and "Your Watch workout only starts from the Strut app on your Home Screen" are plain paragraphs. The reminders card uses `role="status"` and `role="alert"` correctly, so the app is inconsistent.
- **Why it matters:** These explain why something did not work, and a screen reader user never hears them.
- **Breaks:** Consistency; WCAG 4.1.3.
- **Change:** Give them the same status treatment as the reminder messages.

**The unwalked part of the effort strip is very faint**
- **What happens:** `trail-profile.tsx` draws unwalked segments at 15% opacity of the writing colour. Against the field that is far below the 3:1 that WCAG asks of graphics. The tall and short shapes still show hard versus easy, and a screen reader hears each segment, so nothing is lost for the plan itself, but "how much is left" is hard to see in sunlight or with low vision.
- **Why it matters:** The strip is the main progress display.
- **Breaks:** Non-text contrast (WCAG 1.4.11).
- **Change:** Give unwalked segments an outline or stronger tint so their edges clear 3:1.

**Writing at 90% opacity is not covered by the contrast test**
- **What happens:** The activity label, "Round 3 of 5" and the heart-rate line use `opacity-90`. The new contrast test checks full-strength ink only.
- **Why it matters:** Small text on a coloured field is where contrast fails first, and the test gives a false all-clear.
- **Breaks:** Contrast minimum (WCAG 1.4.3).
- **Change:** Drop the opacity on small text, or test the blended colour.

**Heart-rate target uses a fixed age of 23, which the walker can't change**
- **What happens:** `ASSUMED_AGE = 23` in `lib/heart-rate.ts`, shown as "for age 23".
- **Why it matters:** The target range is wrong for most people, and the screen says so but offers no way to fix it. This is a safety-adjacent number on a fitness app.
- **Breaks:** Flexibility and efficiency of use; Match with the real world.
- **Change:** An optional age setting, or remove the numbers and keep the effort words.

**Reset throws the walk away with one tap**
- **What happens:** Reset appears only when paused, which helps, but there is no confirmation or undo.
- **Why it matters:** Pause then a stray tap on the neighbouring Reset loses a half-finished walk.
- **Breaks:** User control and freedom; error prevention.
- **Change:** Either keep it as is (it is already protected from mid-walk taps) or add a short confirm. I would only add a confirm if someone loses a walk.

### Cosmetic

**The plan note appears only after the plan is locked**
- "Reset the timer to change the plan." is invisible until a walk starts, so the walker first meets disabled fields with no explanation. Show it near the disabled fields while locked, which it already does, and consider naming it for screen readers with the field group.

## Positive findings to protect

- Every colour has a word beside it (Push harder, Slow down). Colour is never the only signal.
- The big countdown, the phase word and the buttons are large, with 64px buttons and a 44px sound toggle.
- The mute button states its state in words ("Sound on" or "Sound off") and the icon is hidden from screen readers.
- Real labels on every field; native select and number inputs; visible focus outlines on buttons.
- The header goes `inert` mid-walk, so it stays out of tab order.
- Reduced motion is respected for the heartbeat, and the blink is 1 per second, well under the 3-flashes-per-second limit.
- Contrast of the field colours is now checked by a test, not by eye.
- Reset and Pause are never beside each other mid-walk.

## Not checked yet

- Real VoiceOver on iPhone, keyboard-only use on desktop, text at 200% zoom, and Switch Control.
- Whether the lock-screen reminders read well to a screen reader.
- The Crew rooms screens.
