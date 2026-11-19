## Platform-specific adaptation specs

Context: an iPhone, usually opened from the Home Screen, held or strapped during a walk, ride or elliptical session, with sweat and sunlight on the screen, one hand free, a signal that comes and goes in lifts, car parks, parks and gyms, and a battery that has to last the workout. Measured on a production build with an iPhone-sized browser.

### Weak or no signal

**The app does not open when the signal is weak but not gone.** With the phone connected and every request left unanswered, a page that had been opened before did not appear within 20 seconds. The service worker asks the network first and waits for it with no time limit, so it only falls back to the saved copy when the connection fails outright. A phone with bars and no data (a lift, a basement gym) fails the worst. Change: open the saved copy at once and refresh it in the background; the hashed scripts, styles and fonts under `/_next/static` never change, so they are served from the saved copy first. Test: with every request left unanswered, the saved app opens in under 1 second.

**The first offline open depends on which pages were visited.** The service worker saves a page only after it has been fetched once. Install the app, go offline, and the Walk with friends pages are not there. Change: save the app's pages, scripts, styles and font when the service worker installs. Test: install, switch to airplane mode, open `/` and `/friends`; both open.

**The offline Walk with friends page opens the timer with no explanation.** Offline, the `/friends` address falls back to the timer page, so a walker who tapped Open Walk with friends sees the timer again and no reason. Change: a small offline page for the crew screens that says a crew needs a signal and links back to the timer, and the timer's section shows the same line in place of the button while the phone is offline. Test: offline, tapping the section shows that line and no dead link.

**A crew walk does not survive a reload with no signal.** The countdown keeps running from the host's start moment, because each phone keeps its measured clock offset. A reload while offline asks the server for the crew again, fails, and replaces the walk with the "didn't work" message. Change: keep the crew's plan, its start moment and the clock offset on the phone, resume from them after a reload, and show "Reconnecting…" while the live connection is down. Test: start a crew walk, go offline, reload; the walk continues at the right phase.

**Saved files are never removed.** Every deploy adds new hashed files to one cache that is never cleared, about 660 KB of scripts each time. Change: name the cache for the build and delete the others when the new worker activates. Test: after two deploys the cache holds only the current build's files.

**Keep:** the timer needs no network to run. Reopening offline after one visit works, a walk started offline counts down correctly from the clock, and the timer page loads no database code. When reminders cannot be set up the app says so and the beeps and voice still work.

### Low battery, CPU and data

Measured: 294 KB transferred on a first visit (796 KB before compression: 659 KB scripts, 90 KB font, 22 KB styles, 25 KB page), 5.5 MB of JavaScript memory, 647 page elements, 0% processor use on the idle screen and 2.2% of one core during a walk.

**The screen stays on for the whole walk, which is the biggest battery cost.** The app holds a screen wake lock while a walk runs, except with lock-screen reminders on. Change: none to the wake lock. Turning reminders on already lets the screen sleep, but only the card shown after they are on says so; the card that offers them should say the screen can sleep and the battery lasts longer. Test: the offering card's text names the screen sleeping.

**The page recalculates its styles about 24 times a second during a walk.** The clock updates four times a second for accurate second boundaries, and each update restyles the effort strip and countdown. The cost is small (2.2% of a core), and it is the only recurring work. Change: update the strip once a second and the countdown only when the displayed second changes. Test: style recalculations over 10 seconds fall under 100.

**Keep:** the countdown is rendered as text with one variable font; no images, video or maps; Supabase and the QR code load only on the crew screens; the heartbeat animation stops under reduce motion.

## Priority mapping per context

| Context | Shows first | Demoted or dropped | Context fact |
|---|---|---|---|
| Walking with signal gone | Phase word, countdown and Done | The Walk with friends section becomes one line saying it needs a signal; the reminders card says reminders need one too (to add) | The timer works offline and crews do not |
| Walking in sunlight or with wet hands | Phase word, countdown, Pause and Done at 64px in the lower half | The Plan, Age and Watch fields stay below the walk screen, locked, and the Walk with friends section is hidden | One hand, glare and sweat make small targets unusable |
| Low battery | The same screen, with reminders on and the screen asleep | Nothing is dropped; the card explains the saving | The wake lock is the largest cost |

## Open questions

Should the timer say "No signal" when the phone is offline, or stay silent because the timer does not need one?
