# CLAUDE.md — SF Hacks x GDG AI Hackathon (Oct 2)

## Context
**5.5-hour hackathon. Real-time food recommendation for SFSU students.**

The entire product is:
> "I'm at HSS, vegetarian, $12, 25 min before class. What can I eat?"
> Search → 2 results. Upload menu photo → Gemini extracts → Confirm → Search again → 3 results with new item.

That's it. That's the demo.

**Team:** Solo  
**Build Path:** React form → Cloud Run backend → Gemini extraction → Firestore read/write → live results  
**Success:** End-to-end loop works. Judges see: photo → Gemini → item appears in search.

---

## Mode: SHIP FAST

- **Write the code. Default to doing, not explaining.** If I ask "why did you write it that way?" I want the reasoning, not the code repeated back.
- **Simplest thing that works wins.** No abstractions. Hardcode walk times (they don't change). Hardcode restaurants (3–4). Skip error states nobody will hit.
- **I know:** Python, FastAPI, React, PostgreSQL, OpenAI API, Node.js/Express, Firestore, Google Cloud. Don't suggest unfamiliar tech.
- **No tests, no CI, no Docker.** Firestore config file in `.env.local`. That's it.

---

## The Hard Rule: DEMO PATH FIRST

One end-to-end working flow before ANY polish.

Form → Gemini → Firestore → Results update.

Nothing else matters.

**If I start adding features before that works: STOP ME.**

Ask: "Does the demo loop work end-to-end yet?"

If the answer is no, the answer is no.

---

## Time Discipline (Call These Out)

- **Hour 1:** Infra up. React form responds. Firestore writes. Gemini API ready.
- **Hour 2:** Ranking logic works. Search returns results.
- **Hour 3:** Gemini extraction works. Photo upload → display → Firestore save.
- **Hour 4:** Demo loop verified. Results update after scan.
- **Hour 5:** STOP BUILDING. Demo dry run. Script. Timing. Fallback.

**At any point if we're past Hour 4 and demo path isn't working: tell me to cut scope, not add effort.**

Scope to cut (in order):
1. Multiple diet filters → just vegetarian
2. Ranking sophistication → just filter by budget, sort by time
3. Number of restaurants → 2 instead of 4
4. Firestore → localStorage + seeded data
5. Cloud Run → client-side Gemini call (less secure but faster)

---

## Scope Control (My Weakness — Enforce This)

I will want to add:
- "Let's support more dietary options"
- "What if we add wait-time reporting?"
- "We should let restaurants update their own menus"

**Tell me:** "Hill, does the demo work yet?"

If no: we're cutting that feature.

The judges see a 2-minute demo. They will never see the extra feature. Build for 120 seconds, not hypotheticals.

---

## Demo-Readiness (Flag Early, Not at Hour 5)

- **Seeded data ready** before demo starts (don't create restaurants live on stage)
- **Fallback:** Screenshots + hardcoded Gemini extraction if API fails
- **Test on MY machine:** No "works if the network is good" surprises
- **API keys in .env.local:** Never in code
- **Menu photo** ready to upload (screenshot is fine, real photo is better)

Tell me the moment these aren't ready.

---

## What I Need to Explain to Judges (In 2 Minutes)

**Problem:** "Students have time + budget + diet constraints. Google Maps doesn't answer 'can I realistically eat and make it to class?'"

**Solution:** "GatorBite ranks options by total time: walk to food + prep + walk to class. Gemini extracts menu data from photos so new items appear immediately."

**Technical moment:** "Gemini isn't a chatbot here—it's data pipeline. Photo → extraction → Firestore → affects recommendations."

**I should never** say something like "we built an advanced matching algorithm" if that's not what we're doing. Flag anything I'm about to build that I couldn't explain simply.

---

## Not Today (Post-Hackathon Only)

- Refactoring
- Tests (unit, integration, e2e)
- Auth/permissions
- Production deployment
- Security hardening
- Monitoring/logging
- "Proper" architecture
- Database migrations
- CI/CD

Note them if they matter. Don't build them.

---

## Claude Code Budget: 2.5 Credits Max

**Hour 0:** Cloud Run boilerplate + Gemini wrapper (1–1.5 credits)
- Express server with `/api/menus/extract`, `/api/menus/save`, `/api/recommendations`
- Gemini Vision call with prompt
- Firestore read/write helpers
- Error handling

**Hour 2:** Image processing + Firestore integration (1 credit)
- Base64 encoding
- JSON parsing + validation
- Reuse existing helpers

**If I go over budget:** Use Google's docs templates instead. Cloud Run quickstart is 10 min to copy.

---

## The Conversation Rules (For Me)

- **You ask, I do.** No "let me walk you through this" unless you ask.
- **One-line flags if code is hard to explain.** Example: "This uses Firestore nested queries; you should know that for the judges."
- **Stop me if I'm adding scope.** Especially at hours 3–4 when I feel confident.
- **Celebrate the small wins.** When the search works, that's a checkpoint. When Gemini extraction first succeeds, that's huge.

---

## Firestore Schema (Keep It Simple)

```
restaurants/
  cafe1/
    name: "Campus Cafe"
    walkTimeFromHSS: 4
    walkTimeToThornton: 5
    prepTime: 8

restaurants/cafe1/menuItems/
  item1/
    name: "Veggie Wrap"
    price: 9.50
    vegetarian: true
    vegan: false
    source: "gemini-scan"
    confirmedAt: timestamp
```

That's it. No complex nested queries. No transactions. Dead simple.

---

## Contingency (If Things Break Mid-Build)

**Gemini API is down?** Hardcode sample extraction. Judges never know.

**Firestore write fails?** Use localStorage. Less impressive but works for demo.

**Cloud Run deployment is slow?** Run backend locally with `npm start`. SSH into the judge's machine if needed.

**Photo upload is broken?** Use a hardcoded Base64 string. They see the extraction anyway.

**Ranking is off?** Show them the algorithm. They care about the Gemini moment more.

---

## Dry Run Checklist (Hour 5:00 Exactly)

- [ ] React builds
- [ ] Form submits without errors
- [ ] Search returns results (should show 2–3 recommendations)
- [ ] Upload menu photo
- [ ] Gemini extracts (should return 3–4 items)
- [ ] Confirm button saves to Firestore
- [ ] Search again with same constraints
- [ ] New item appears in results
- [ ] Timing: start to finish, < 2 minutes
- [ ] I can explain the flow in 1 paragraph without stuttering

If all green: ship it. If any red: fix only that. Don't add features.

---

## Last 30 Minutes (HOUR 5:30–6:00)

**No new code.** Only fixes for the dry run.

If something broke in dry run, fix it. Otherwise: prepare slides, rehearse, breathe.

---

## Success Metrics (Not "Good to Have")

✅ Form works  
✅ Mock recommendations display  
✅ Gemini extracts 1 real menu  
✅ Firestore saves confirmed items  
✅ New items appear in second search  
✅ Demo runs start-to-finish without crashes  
✅ I can explain it to judges  

7 out of 7 = gold submission.

6 out of 7 = still great (only feature or explanation missing).

5 or fewer = we didn't scope right or shipped too late.

---

## The Vibe

This is a sprint. No perfectionism. Ugly code that works beats elegant code that times out.

The demo is 2 minutes. Everything we build is in service of those 120 seconds.

You got this. 🚀

---

**REMINDER: You've built full-stack before (Y STEM + Chess: Node/Mongo). You know how to move fast. This is just smaller.**
