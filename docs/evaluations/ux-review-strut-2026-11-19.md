## UX anti-pattern review, all of Strut

Covers the timer, the Plan, the Watch setting, the reminders card and the Walk with friends screens (name, start or join, waiting room, in-walk, confirmations). Checked against the ui-ux-pro-max guidance database for interaction, feedback, forms, navigation and accessibility, with the code read and an automated scan plus size measurements on the name and join screens. The waiting room and in-walk screens need a live room, so those were reviewed from the code only.

### High

**Nothing on the timer leads to Walk with friends.** The timer, its About dialog and its Plan never mention or link to `/friends`; the page can only be reached by typing the address or from a shared link. A new visitor can't discover the feature the app is now built around. Fix: one quiet "Walk with friends" link under the Plan on the timer, and the same line in About. The planned Workout and Crew tabs would replace this link, but nothing else is planned before them. Test: from the timer, one tap reaches `/friends`, and the Back link returns.

### Medium

**The reminders card nags people who already said no.** A phone that blocked notifications shows "Reminders are blocked" on every visit, and a Safari tab shows "Want reminders on your lock screen?" on every visit; neither can be dismissed. This is the permission nagging pattern, and it also pushes the controls up the screen. Fix: show each once, let it be dismissed and remembered, and keep the settings explanation under the Plan instead. Test: dismiss it, reload, and it stays gone.

**Buttons that wait for the network don't say so.** "Start a room", "Join the room", "Join as {name}" and "Start the walk" only grey out while the request runs; "Save my name" does change to "Saving…". On a slow connection the walker can't tell a tap from a freeze. Fix: the label changes to "Starting…", "Joining…" in the same way as Save. Test: with the network slowed, each button's label changes within 100ms of the tap.

**Name errors appear below the Save button, away from the field.** A too-short or too-long name shows its message after the button, so a screen reader or a thumb is already past it. Fix: show the message directly under the field and tie it to the field with `aria-describedby`. Test: the message sits between the field and the button.

**Nobody hears who joined.** The "Here now" list updates live as friends join and leave, with no announcement, so a screen reader user waiting as host never learns that someone arrived. Fix: a polite status such as "Sam joined" and "Sam left". Test: a second browser joining produces one announcement.

### Low

**Link-styled controls are 20px high.** "Back to the timer", "Change my name", "Delete my data" and "Remove" measure 20px tall, under 24px for WCAG 2.5.8 and well under 44px. "Remove" sits beside names the host might tap by mistake, and "Delete my data" is stacked next to "Change my name". Fix: give them a 44px tap area with padding; keep the look. Test: each measures at least 44px high.

**The confirm dialog's comment promises more than it does.** It says tapping outside counts as the safe choice, but only Escape does. On an iPhone there is no Escape key, so the buttons are the only way out; they are clear, with the safe one focused, so nothing is broken. Fix: either make a tap outside cancel or correct the comment.

**"For age 23" shows before anyone chose an age.** It is correct and editable now, but nothing next to it says where. Fix: make "age 23" a link to the Age field, or word it "for age 23 (change in Plan)".

### Keep

- The confirm dialogs for deleting data and closing a room put the safe choice first and say what will happen in plain words.
- Rooms never ask for an account; the name has a suggestion filled in.
- The join code field has a real label, a placeholder example and only enables Join when the code is complete.
- The countdown is the loudest thing on the walk screen, the phase has words as well as colour, and the controls are large.
- The automated accessibility scan reports nothing on the name and join screens.
- Warm, plain copy everywhere ("Pick a name so your friends know it's you. No account needed.").
