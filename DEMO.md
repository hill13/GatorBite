# GatorBite: pitch and demo

Live site: https://gator-bite.vercel.app (API on Render, data in Firestore, menus and schedules read by Gemini)

## One-line pitch
GatorBite tells SFSU students what they can actually eat, and still make it to class, based on their time, budget and diet.

## Description (3 lines)
Students enter where they are, where class is, and how many minutes they have, and GatorBite ranks food by total time: the walk there, prep, and the walk to class.
Gemini turns a photo of any menu or class schedule into structured data, so new dishes show up in the next search and the app finds the gaps between classes for you.
Filters cover vegetarian, vegan, halal-friendly, no pork or beef, gluten-free and nut-free, and anything you add is private to your account.

## The 2-minute pitch (spoken)

**Problem (15 s).** "Students have three constraints at once: time, budget and diet. Google Maps tells you where food is. It doesn't tell you whether you can eat and make it to class in 25 minutes, and it knows nothing about your menu or your schedule."

**Solution (15 s).** "GatorBite ranks every option by total time: walk to the food, prep, then the walk to your next class. Only what fits your minutes, your budget and your diet shows up."

**Technical moment (say it while Gemini runs).** "Gemini isn't a chatbot here, it's our data pipeline. A photo goes in, structured data comes out, a human checks it, and it changes the next recommendation. The same pipeline reads a class schedule and finds your eating windows."

**Close (10 s).** "We built it for SFSU: 13 real campus buildings, three real restaurants, real menus. Next, we'd pull walking times from a maps service and let students share verified menus."

## Demo script (2:00)

Start already **signed in** on the live site, on the Home page.

| Time | Do | Say |
|---|---|---|
| 0:00 | Home page | The problem line above. |
| 0:20 | Set **I'm at: Health & Social Sciences (HSS)**, **Next class: Thornton Hall**, **Budget 9**, **Minutes 25**, Diet **Vegetarian**. Click **Find food**. | "I'm at HSS, class at Thornton in 25 minutes, vegetarian, nine dollars. 16 options, fastest first: 12 minutes at Cafe Rosso, which includes the walk, the prep and getting to class." |
| 0:45 | Tap **Halal-friendly** or **Gluten-free** on and off, and click Find food | "Filters combine. Gluten-free and nut-free are best guesses from menu text, so we tell students to check with the restaurant." |
| 0:55 | Go to **Add a restaurant** (nav). Scroll to **2. Scan its menu**. Pick **Taza**, upload `demo-assets/taza-menu-board.png`, click **Extract with Gemini** | Technical moment line, while it reads (about 7 seconds). |
| 1:15 | On the review list: find **Nachos Jalisco**, untick **Veg**, tick **Pork** and **Beef**. Click **Confirm & add to my menu** | "Gemini guessed vegetarian, but the menu says chicken, pork or beef. A human checks before anything is saved. When Gemini isn't sure, it defaults to 'contains'." |
| 1:30 | Back to **Home**. Click **Find food** again | "Same search: 21 options instead of 16. The new Taza dishes are marked **NEW**, from a photo, in seconds." |
| 1:45 | Go to **Plan your day** | "I uploaded my schedule earlier. It found the gap between my classes and suggests the best three places that fit, with time to eat." |
| 1:55 | Close line | Close line above. |

Numbers: with these settings, 16 results before and about 21 after (22 if the Nachos Jalisco tag is left as Gemini guessed it). The NEW items appear around positions 9 to 11. If your count differs by one or two, don't worry; say "about".

## Before the demo (T-30 minutes)

- [ ] Run `cd backend && npm run seed`. It resets the shared restaurants.
- [ ] Run `npm run reset-user -- your@email.com`. It wipes your private restaurants, scanned items and schedule, so "before" is clean.
- [ ] On the live site, sign in, open **Plan your day**, upload `demo-assets/sample-schedule.png`, pick buildings if asked, and **Save**. Now the Plan page is ready.
- [ ] Do one search to wake Render (the free plan sleeps and the first request can take up to a minute).
- [ ] Put `taza-menu-board.png` and `sample-schedule.png` somewhere easy to find on the desktop.
- [ ] Have a screen recording or screenshots of a good run as a backup.
- [ ] Close other tabs, silence notifications, and use the same browser you signed in with.
- [ ] After a rehearsal, run the two reset commands again.

## If something goes wrong

| Problem | Do |
|---|---|
| Site is slow on first click | Say "the free tier is waking up" and wait. Don't refresh. |
| Gemini fails | The screen shows "⚠️ Sample data (Gemini unavailable)". Say it's the fallback and keep going, or show the screenshot of the real run. |
| Sign-in fails | Set `AUTH_DISABLED=true` on Render and `VITE_AUTH_DISABLED=true` on Vercel, redeploy both before the demo, not during it. |
| Everything is down | Run locally (`npm start` in `backend`, `npm run dev` in `frontend`) and demo on `localhost:5173`. |
| No Wi-Fi | Play the recorded backup. |

## Questions judges may ask (honest answers)

- **How do you know the walking times?** "They're entered by hand. Three buildings were measured, the rest are estimates. We tested asking Gemini to guess them and it was 2 to 3 times too low, so we didn't ship that. Next step is a maps service."
- **Is halal-friendly real halal?** "No. It means no pork and no alcohol on the menu. A menu can't prove certification, so we say to confirm with the restaurant."
- **How accurate are the allergy and diet tags?** "They're best guesses from menu text. Gemini is told to default to 'contains' when unsure, and the student reviews every item before saving. We'd never call it allergy-safe."
- **Why Gemini?** "Menus and schedules are photos. Gemini turns them into structured data, which is what makes new places usable the same minute."
- **Who sees what I add?** "Only you. Restaurants, scanned menus and your schedule are private to your account. The three shared restaurants and 13 buildings are visible to everyone."
- **Why login?** "To keep your private data private, and to stop anonymous users from editing. Email-link sign-in proves someone owns a real inbox, and we limit it to SFSU addresses plus an approved list. SFSU email runs on Microsoft, and Gmail was the only option that worked for us in a day."
- **What would you do next?** "Pull walking times from a maps service, share verified menus between students, and add real prep and wait times."
