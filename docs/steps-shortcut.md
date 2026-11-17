# Steps from Apple Health (a test)

Strut can't read Apple Health, but a Shortcut can. This is a test of whether a Shortcut can add up your steps for a stretch of time and send the total back to Strut. If it works, it becomes the way Strut counts steps for a walk.

**How it works.** Strut makes a one-time code and opens your Shortcut with a little package of details: the code, the start and end of the stretch to add up, and where to post the answer. The Shortcut adds up your steps in that stretch and posts the total to Strut's database with the code. Strut sees the total appear. There is no "come back" link, so it works from any app, including the Home Screen app.

## Make the Shortcut

Open **Shortcuts** on your iPhone, tap **+**, and name it **Strut Steps**. Then add these actions in order. Names of actions can differ a little between iOS versions. If one is missing, tell me what you see and I'll adjust the recipe.

1. **Get Dictionary from Input.** Its input is **Shortcut Input**. (Strut sends the details as text that looks like a dictionary.)
2. **Get Dictionary Value.** Get the value for the key `start` in the dictionary.
3. **Get Dates from Input.** Its input is the value from step 2. This turns the text into a date.
4. **Get Dictionary Value.** Get the value for the key `end` in the dictionary from step 1.
5. **Get Dates from Input.** Its input is the value from step 4.
6. **Find Health Samples.** Add these filters:
   - **Type** is **Steps**
   - **Start Date** is after the date from step 3
   - **End Date** is before the date from step 5

   Turn off any limit on the number of samples.
7. **Calculate Statistics.** Choose **Sum**, with the health samples from step 6 as the input. (If it asks for numbers, use each sample's **Value**.)
8. **Round Number** to the nearest whole number.
9. **Get Dictionary Value.** Get the value for the key `code` in the dictionary from step 1.
10. **Get Contents of URL.**
    - **URL:** the value for the key `url` in the dictionary from step 1
    - **Method:** POST
    - **Headers:** `apikey` set to the value for the key `key` in the dictionary, and `Content-Type` set to `application/json`
    - **Request Body:** JSON, with two fields. `claim_code` is the code from step 9 (text). `step_count` is the rounded number from step 8 (number).
11. Optional: **Show Notification** saying the number you sent, so you can see it worked.

The first time you run it, iOS will ask whether the Shortcut may read your **Steps** from Health, and whether it may send data to the web address. Say yes to both.

## Run the test

1. In Safari, open the Steps test page that goes with this change. It isn't linked from the app.
2. Walk for a few minutes first, or use a stretch when you know you walked.
3. Tap **Check my steps**. The Shortcut should open, run, and finish.
4. Switch back to the Steps test page. The number should appear within a few seconds.
5. Compare it with Apple Health: open **Health**, tap **Steps**, and look at the same time window.

## What to tell me

- Did the Shortcut open by itself, and did it finish without an error?
- Did the number appear on the page, and how many seconds did it say it took?
- Does it match Apple Health? If it is about double, your phone and your Watch were both counted. Say so, because that changes how I add them up.
- If something stopped, which action was it, and what did it say?
