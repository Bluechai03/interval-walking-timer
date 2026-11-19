## Accessibility Audit — Per WCAG Principle

Severity: Critical blocks a task for someone using assistive technology; High makes the task very difficult but possible; Medium fails a WCAG criterion without blocking access; Low meets WCAG and falls short of inclusive design.

### Perceivable

**Medium: the walk header overflows the screen at large text sizes.** At 200% text the sound button (minimum width 8.5rem, which doubles with the text) pushes the heading row 154px past the screen edge, so the page scrolls sideways. Fails 1.4.10 Reflow. Change: let the heading row wrap, with the sound button dropping under the phase word when the two do not fit, and remove the minimum width from the button. Test: at 200% text on a 390px screen the page has no horizontal scroll.

**Low: the focus indicator on the plan inputs is a 1px colour change.** Fast, Slow, Rounds, Get ready, Age and the three Watch fields remove the outline and change only the bottom border from the line colour to the ink colour. Colour alone fails the inclusive-design bar and is easy to miss in sunlight. Change: a 3px solid outline in the ink colour with a 2px offset on every input and the activity select, matching the buttons. Test: tabbing to each field shows a 3px outline.

Keep: contrast of the writing on the hard, easy and done fields is at least 4.5:1, the you-are-here marker at least 3:1, and the page text at least 4.5:1 in dark and light, enforced by `palette-contrast.test.ts`. A scan of the idle screen and the running screen, in dark and in light, found no contrast failures.
Keep: every phase has a word beside its colour ("Walk fast", "Walk slow").
Keep: the page reflows at 320px wide with no horizontal scroll.
Keep: the heartbeat animation stops under reduce motion, and the blink is 1 per second, under the 3 per second limit.

### Operable

**High: the Watch switch sits inside a summary, so two controls share one place.** `watch-workout-setting.tsx` puts a `role="switch"` button inside the `<summary>` of the details element. A scan flags it as serious nested interactive content: tabbing stops twice ("Start my Watch too" as the summary, then again as the switch), and a screen reader may not expose the switch inside the summary. Fails 4.1.2. Change: move the switch out of the summary into the heading row beside it, and make the summary a separate "Watch settings" disclosure that opens when the switch turns on. Test: one Tab stop reaches the switch, and VoiceOver announces it as a switch with its state.

**Medium: the page has no heading level one while a walk is running.** The header with "Strut" goes inert mid-walk, which removes the only h1 from the page for assistive technology. Fails the best-practice rule for a level-one heading and removes the way to jump to the top by heading. Change: apply inert to the About button only, and keep the "Strut" heading in the accessibility tree, hidden visually by the existing fade. Test: during a walk the page has exactly one h1.

**Low: the Watch switch is 48px wide and 28px high, and the number fields are 40px high.** Above the 24px minimum of 2.5.8 and below the 44px recommended for primary controls. Change: raise the switch to 44px high by giving the button padding around its 28px track, and the fields to 44px. Test: each measures at least 44px in both directions.

Keep: Start, Pause, Resume and Reset are 64px high; the About and Sound buttons are 44px; spacing between adjacent buttons is 12px.
Keep: tab order follows the reading order (About, Sound, Start, Activity, Fast, Slow, Rounds, Get ready, Age, Watch settings); every button shows a 3px outline.
Keep: the About dialog moves focus in on open, closes on Escape and returns focus to its button.
Keep: Reset needs two taps on a paused walk, and appears only while paused.

### Understandable

**Low: the age box stays editable during a walk while the rest of the plan locks.** A change mid-walk alters the spoken target heart rate from the next phase, and the lock-screen reminders keep the age they started with. Change: lock Age with the other plan fields once the walk starts. Test: the Age input is disabled while a walk is running.

Keep: every field has a visible label; out-of-range values show a message that names the allowed range, in a status region that is announced.
Keep: the copy is plain and in the second person, and the time unit is spoken to screen readers ("Fast in minutes").

### Robust

Keep: one main landmark; headings run h1 (Strut) then h2 (Plan, Start my Watch too) with h3 inside the About dialog; the current phase and the plan are named regions.
Keep: the effort strip is an ordered list whose items read "Fast 3:00" and "Slow 3:00, walked", with the current item marked.
Keep: an automated scan (axe, WCAG 2.2 AA plus best practices) reports only the two findings above.

## Screen Reader Flow Documentation

Reading order matches the visual order. The tab order matches except that the hidden header during a walk is skipped.

| Change | Announced | Politeness |
|---|---|---|
| Phase changes | "Walk fast", "Walk slow", "Get ready", "Walk complete" (words follow the chosen activity) | polite |
| Plan value out of range | "Rounds can be 1 to 20." | assertive |
| Sound locked by iOS | "Tap anywhere to turn sound on. iOS keeps it off after a trip to Shortcuts." | polite |
| Watch workout blocked in a browser tab | "Your Watch workout only starts from the Strut app on your Home Screen…" | polite |
| Reminders on, blocked or failed | the reminder card text | polite, or assertive for a failure |
| Per-second countdown | not announced | none |

## Keyboard Navigation Map

Tab order: About, Sound, Start (or Pause), Reset when paused, Activity, Fast, Slow, Rounds, Get ready, Age, Watch switch, then the Watch fields when open.
About opens: focus moves to the dialog's first control. About closes: focus returns to the About button.
Start: focus stays on the button, which becomes Pause. Reset first tap: focus stays on Reset, which reads "Tap again to reset"; leaving it cancels the question.

## Open Questions

Should the blink in the last three seconds of a phase continue when the phone is set to reduce motion? It is a signal for a phase change and runs at 1 per second, within the safe limit, and the code comment keeps it on purpose; a walker with a motion sensitivity may want it off.
