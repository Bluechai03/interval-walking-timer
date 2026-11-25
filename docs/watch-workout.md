# Start an Apple Watch workout from Strut

iPhone with an Apple Watch only. The timer cannot start a workout by itself, so it runs a Shortcut you make once.

1. Open **Shortcuts** on your iPhone and tap **+**.
2. Add the **Start Workout** action. Set Type to **Walking**, Location to **Outdoor** (make a second one for **Indoor**), Goal to **Open**.
3. Name it **Strut Outdoor** (or anything you like), and tap **Done**.
4. In Strut, turn on **Start my Watch too**. It is off until you do. If you used another name, open the section and type the exact name.

Open Strut from your **Home Screen** icon, not from Safari. In a Safari tab, Strut won't run your Shortcuts at all and tells you why: a Shortcut that ends by opening the Home Screen app would pull you away from the tab where your walk is running. Only the Home Screen app can send lock-screen reminders, and iOS won't send you back to it from Shortcuts, so Strut doesn't ask.

When you tap **Start**, Strut starts its countdown in the app and opens your Shortcut. Your Watch starts the workout a few seconds later. Switch back to Strut afterwards (the app switcher, or the small arrow at the top left of the screen). Strut's timer keeps running while you're away.

**Not recommended: ending your Shortcut with `webapp://`.** Strut doesn't appear in Shortcuts' Open App list, because that list doesn't include Home Screen web apps, so there is no supported way to send you back. On at least one iPhone, an **Open URLs** action set to `webapp://` did bring the Home Screen app back, but Apple doesn't document it, and it opens the web app you used most recently. If that is a different Strut, you land in an app with no walk running while your walk carries on in the first one. Leave the action out and switch back yourself (the app switcher, or the small arrow at the top left of the screen).

**Keep one Strut icon on your Home Screen.** Each icon behaves as its own app, with its own settings, its own walk and its own lock-screen reminders, and none of them can see the others. If a Shortcut opens a different Strut and you tap Start there, you will have two walks running, and your lock screen will show a reminder from each, one after the other. If it happens, open the Strut that was running first and end that walk with **Done**, which stops its reminders, and delete the extra icon.

**Keeping the Watch and Strut in step.** With the switch on, Strut's countdown lasts as long as the **Watch delay** (6 seconds to begin with) instead of Get ready. The walk begins when the countdown ends, so it should start on the same beat as the Watch's workout. To tune it, tap Start and watch your Watch: if the Watch's timer reads 0:00 before Strut says go, make the delay shorter. If it reads 0:00 after, make it longer. It's the same every walk once it's right.

To end the workout too, make a second Shortcut with the **End Workout** action and name it **Strut End**. If you used another name, type it under **Shortcut to end it**. Strut runs it when your walk finishes, or when you tap Reset. Without it, end the workout on your Watch, or from the bar at the top of your phone.

If iOS blocks the automatic end, tap **End Watch workout** on the finished screen.

Shortcuts has no way to pause a workout, so Pause only pauses the timer. Your Watch keeps counting until the workout ends.

Start runs the Shortcut each time you start a new walk, including after Reset, so end the old workout on your Watch first.

With the switch off, the timer starts as normal, with the Get ready countdown. If a name is wrong, Shortcuts shows an error, and you can switch back to Strut, where the timer is already running.

## In a room

Walking with friends works with the same Shortcuts and the same switch.

- A room counts down for at least 10 seconds, so there is time for your Watch to start before the walk does.
- Strut tries to open your start Shortcut by itself, one Watch delay before the walk begins, so the workout and the walk start on the same beat. iOS may refuse to open an app that nobody tapped for, so there is always a **Start my Watch** button on the countdown screen. Tap it if your Watch hasn't started.
- If you join after the walk has begun, tap **Start my Watch** yourself. Your Watch workout will begin a few seconds into your walk.
- When the walk finishes, Strut runs your end Shortcut after the last cue. It also runs it if you leave the walk early. **End Watch workout** on the finished screen is there in case iOS blocks it.
