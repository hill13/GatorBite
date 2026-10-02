# GatorBite — Build Plan (5.5 Hour Hackathon)

**What can I actually eat before my next class?**

---

## The Idea (30 seconds)

Students have simultaneous constraints: time until class, budget, dietary preference, location, destination. Google Maps answers "where can I eat?" GatorBite answers "what can I realistically eat and still make it to class?"

Gemini Vision extracts menu data from photos. Firestore stores it. Recommendations read from Firestore. When a student confirms a scanned menu, future searches find those items.

---

## Core Demo Loop

```
BEFORE scanning:
  Search: $10, Vegetarian, 25 min, HSS → Thornton
  Results: 2 options

SCAN & CONFIRM:
  Upload menu photo
  Gemini extracts: Veggie Burrito — $8.99
  Click "Confirm & Add"
  Saved to Firestore

AFTER scanning:
  Search: $10, Vegetarian, 25 min, HSS → Thornton
  Results: 3 options
  🌯 Veggie Burrito — $8.99 ← NEW
```

That's the entire demo. Everything else is support.

---

## Hour-by-Hour

### **Hour 0:00–1:00 | Infrastructure + UI Shell**

**Goal:** Gemini API works locally. Firestore reads/writes. React form responds.

**What to build:**
1. React/Vite project (2 min)
2. `.env.local` with Gemini API key + Firestore config (2 min)
3. Cloud Run backend skeleton (10 min):
   - POST `/api/menus/extract` (takes image, calls Gemini)
   - POST `/api/menus/save` (saves to Firestore)
   - GET `/api/recommendations` (reads from Firestore, ranks)
4. React form (15 min):
   ```
   Time: [15] [25] [30] [45] min
   Budget: [$8] [$10] [$12] [$15+]
   Diet: [All] [Veg] [Vegan]
   Current: [HSS ▼]
   Destination: [Thornton ▼]
   [Find Food]
   Results area (placeholder)
   ```
5. Test: Form submits, console shows data (5 min)
6. Test: Cloud Run endpoint responds (5 min)
7. Test: Firestore write works (5 min)

**Claude Code:** 1–1.5 credits. Cloud Run boilerplate + Gemini wrapper + Firestore helpers. You wire the React button.

**Milestone:** Form works. API responds. Firestore is live.

---

### **Hour 1:00–2:00 | Mock Data + Ranking Logic**

**Goal:** Recommendation engine works. Real data flow.

**What to build:**
1. Seed 3–4 restaurants in Firestore (by hand or script):
   ```json
   {
     "id": "cafe1",
     "name": "Campus Cafe",
     "walkTime": {"from_hss": 4, "from_thornton": 5},
     "prepTime": 8
   }
   ```
2. Add ~8 mock menu items:
   ```json
   {
     "restaurantId": "cafe1",
     "name": "Veggie Wrap",
     "price": 9.50,
     "vegetarian": true
   }
   ```
3. Implement ranking algorithm (60 lines max):
   - Filter by budget
   - Filter by diet
   - Calculate: walkTo + prep + walkFrom
   - Keep only if totalTime <= timeLimit
   - Sort by time
   - Return top 3
4. Wire form → ranking → display results
5. Test with mock data (should show 2–3 options)

**Claude Code:** 0 credits. You write this logic yourself.

**Milestone:** Form → Search → Results (with mock data). No Gemini yet.

---

### **Hour 2:00–3:15 | Gemini Menu Scanner**

**Goal:** Photo upload → Gemini extraction → UI display → Firestore save.

**What to build:**
1. File upload input (React) (5 min)
2. Pass to Cloud Run endpoint (already scaffolded from Hour 0) (5 min)
3. Cloud Run:
   - Receive Base64 image
   - Call Gemini Vision with prompt:
     ```
     Extract menu items from this image. Return ONLY valid JSON:
     {
       "restaurant": "name",
       "items": [
         {"name": "...", "price": number, "vegetarian": bool, "vegan": bool}
       ]
     }
     ```
   - Return JSON (20 min)
4. React: Display extracted items in a confirmation card (10 min):
   ```
   Gemini found 4 items:
   🌯 Veggie Burrito   $8.99  ✓ Vegetarian
   🥗 Tofu Salad       $10.99 ✓ Vegetarian
   [Confirm & Add]  [Cancel]
   ```
5. On confirm: POST to `/api/menus/save` → writes to Firestore (5 min)
6. Test with a real menu photo (10 min)

**Claude Code:** 1–1.5 credits. Image encoding + Gemini API call + response parsing. You wire the button.

**Milestone:** Upload photo → Gemini extracts → display → confirm → Firestore saves. End-to-end works.

---

### **Hour 3:15–4:15 | Connect the Loop**

**Goal:** Newly scanned items appear in search results.

**What to build:**
1. Modify `/api/recommendations` to query Firestore instead of mock data (5 min)
2. Test: Search → 2 results
3. Upload menu photo, confirm
4. Search again → 3 results (new item appears)
5. Verify ranking is correct (new item should be in top 3 if it fits constraints)

**Claude Code:** 0 credits. Wire existing functions.

**Milestone:** ENTIRE DEMO PATH WORKS END-TO-END.

---

### **Hour 4:15–5:00 | Prepare Demo**

**Goal:** Bulletproof the demo. No surprises during presentation.

**What to build:**
1. Seeded Firestore data ready (don't discover missing restaurants during demo)
2. Pre-upload test menu image (don't try uploading live)
3. Test the exact flow you'll show judges:
   - Search with specific constraints
   - See 2 results
   - Upload photo
   - Confirm
   - Search again
   - See 3 results
   - Point to new item
4. Time it (should be ~90 seconds start to finish)
5. Prepare fallback: hardcoded JSON if Gemini API fails live

**Do NOT add features here.** Only:
- Fix bugs that break the demo
- Polish obvious UI issues
- Prepare screenshots as backup

---

### **Hour 5:00–5:30 | Rehearse**

**Goal:** You can explain it to judges in 2 minutes.

**What to do:**
1. Write 2-minute script:
   - Problem: "I'm at HSS, vegetarian, $12, 25 min before class at Thornton"
   - Solution: "GatorBite ranks options by feasibility"
   - Show search results
   - Upload menu photo
   - Show Gemini extraction
   - Confirm
   - Show new results
   - Explain: "Gemini turned unstructured menu into structured data. That data is now searchable."
2. Practice timing (2 minutes exactly)
3. Do a dry run
4. Fix anything that breaks

---

## Architecture (Very Simple)

```
Frontend (React)
  ↓ [POST /api/menus/extract + /api/menus/save]
  ↓ [GET /api/recommendations]
Backend (Cloud Run, Node.js)
  ↓ [Gemini Vision API]
  ↓ [Firestore read/write]
Firestore
  restaurants/
    menuItems/
```

---

## What You're NOT Building

- ❌ Wait-time reporting
- ❌ Google Maps real walk times
- ❌ Class schedule integration
- ❌ User authentication
- ❌ Animations/dark mode
- ❌ Multiple dietary filters (just vegetarian/all)
- ❌ Restaurant admin dashboard

These are Phase 2. Today: ONE working feature.

---

## Fallback Hierarchy (if things break)

**Hour 3:** If Gemini API is slow → hardcode sample extraction
**Hour 4:** If Firestore is flaky → use localStorage instead
**Hour 4:** If Cloud Run deployment fails → run backend locally during demo
**Hour 5:** If anything breaks during dry run → show screenshots instead of live demo

---

## Claude Code Budget: 2.5 credits max

| When | Task | Credits | Why |
|------|------|---------|-----|
| Hour 0 | Cloud Run boilerplate + Gemini wrapper | 1–1.5 | High complexity, easy to break |
| Hour 2 | Image processing + Firestore helpers | 1 | API integration is tricky |
| **TOTAL** | | **2–2.5** | |

**If lower:** Skip Cloud Run boilerplate → use Google's Node.js template from docs.

---

## Demo Script (Read This)

```
"I'm a student at SFSU. I'm at HSS, I'm vegetarian, 
I have $12, and class starts in Thornton in 25 minutes.

Google Maps tells me where restaurants are. But I need something 
that fits my time AND budget AND diet simultaneously."

[Enter constraints, click Find Food]

"GatorBite ranks by feasibility. Here are 2 options 
that fit my constraints."

[Show results]

"But menus change. We can't manually maintain them.

So students photograph new menus."

[Upload menu photo]

"Gemini Vision reads the photo and extracts structured data 
automatically. I click confirm."

[Show Gemini extraction, click Confirm]

"Now that data is in our database. Watch what happens 
when I search with the same constraints."

[Search again]

"The item we just scanned now appears as an option. 
That's why GatorBite needs Gemini—not to chat, 
but to turn menu photos into searchable food."

[Done. 2 minutes.]
```

---

## Success Criteria

✅ Form inputs work  
✅ Mock recommendations display  
✅ Gemini extracts menu from real photo  
✅ Extracted data saves to Firestore  
✅ New items appear in second search  
✅ Demo runs without crashing  
✅ You can explain it to judges in 2 min  

If all 7 work, you have a hackathon project.

---

## Prepping for Demo Day

**Bring:**
- Laptop + charger
- Menu photo (screenshot is fine)
- Backup menu photo
- This script printed out
- Firestore credentials file (don't leave on stage)

**Before you go on stage:**
- [ ] Firestore is live
- [ ] Cloud Run endpoint is responding
- [ ] Gemini API key works
- [ ] React app builds and runs
- [ ] Dry run completed successfully
- [ ] Timing checked (2 min)

---

## Post-Hackathon (Don't Do Today)

- Tests
- Auth
- Real Google Maps
- Wait-time reporting
- Class schedule integration
- Production deployment hardening
- Monitoring/logging

Note them, build them next.

---

**Ship fast. Demo clean. Ship the path, not the features. 🚀**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express (Cloud Run) |
| Database | Google Cloud Firestore |
| AI | Google Gemini Vision API |
| Deployment | Vercel (frontend) + Cloud Run (backend) |

---

## Google Cloud Setup (Essential Only)

### Prerequisites
- Google Cloud project
- `gcloud` CLI
- Service account with Firestore + Cloud Run permissions

### Minimal Setup (10 min)

```bash
# 1. Enable APIs
gcloud services enable firestore.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# 2. Create Firestore database
gcloud firestore databases create --region=us-central1

# 3. Set environment variables
export GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)
export VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Deploy Backend (Optional - Run Locally During Demo)

```bash
# If deploying to Cloud Run:
gcloud run deploy gatorbite-backend \
  --source . \
  --runtime nodejs18 \
  --region us-central1 \
  --allow-unauthenticated
```

### Deploy Frontend

```bash
npm run build
vercel deploy --prod
```