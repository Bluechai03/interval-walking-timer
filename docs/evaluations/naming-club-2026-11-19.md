# The name "Club" for a shared walk in Strut

## Anti-Pattern Verdict
Clean. The name carries no pressure, no scarcity and no manipulation.

## Priority Issues

### Major

**"Club" and the planned "Crew" tab would name the same thing twice.** The agreed redesign has a Workout tab and a Crew tab, and the Crew tab is where shared walks live. With the feature called Club, a person would tap Crew to find their club, and the page would say Club inside.
- **What happens:** The redesign plan names the tab "Crew", the buttons now say "Start a club", "Join the club" and "Close the club", and the heading says "Walk with friends".
- **Why it matters:** Three words for one feature make a new person wonder whether they are three things.
- **Breaks:** consistency and standards.
- **Change:** One word for the group, used in the tab, the buttons, the messages and the glossary.

### Minor

**"Club" promises a group that lasts, and the group ends.** A club implies membership, a return visit and a list of clubs you belong to. A Strut group closes a few hours after the walk, and "This club has closed" reads like something went wrong rather than the walk simply being over. The delete confirmation, "takes you out of every club", reinforces that people belong to several.
- **What happens:** The glossary says it closes a few hours after the walk ends. Nothing in the app lets anyone return to a past club, since My walks was dropped.
- **Why it matters:** A friend who comes back the next day looks for their club and finds a closed one.
- **Breaks:** match between the system and the real world.
- **Change:** Use a word for a group that gathers for a walk and then disperses, and word the closed state as the walk being over.

**"Close the club" and "Leave the club" are heavy for a one-walk group.** "Close the club" sounds like shutting a business; the confirm dialog needs a paragraph to explain it.
- **What happens:** The host's exit button and its dialog use the same weight of language as a permanent action.
- **Why it matters:** The host hesitates over a button that only ends a 30-minute walk.
- **Breaks:** match between the system and the real world.
- **Change:** Pick a verb pair that sounds light, such as ending a walk, and keep the confirmation.

**The feature has a name on the heading and another on the button.** The page heading reads "Walk with friends" and the first button reads "Start a club".
- **What happens:** `/friends` is headed "Walk with friends", the timer's section is headed "Walk with friends", and the group inside is the club.
- **Why it matters:** A person has to learn that the feature and its unit are different words.
- **Breaks:** consistency and standards.
- **Change:** Keep "Walk with friends" as the feature's description and let the group word be the same one everywhere beneath it.

## Positive Findings
- "Club" is short, warm and plain, and it removed the technical sound of "room".
- It is gender-neutral, needs no explanation for a first-time visitor and works for walk, elliptical and bike.
- It sits well beside the join code ("Join the club, code BCDF") and the host.
