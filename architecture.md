# GatorBite Architecture

## Overview
Students enter building, diet, budget, and minutes until class. GatorBite returns food options ranked by total time (walk to food + prep + walk to class). A student can upload a menu photo. Gemini extracts the items, the student confirms them, and they are saved to Firestore. The next search includes the new items.

**Demo loop:** Form → Search (2 results) → Upload photo → Gemini extracts → Confirm → Firestore write → Search again (3 results).

## Diagram
```
React (Vite)  ──HTTP──▶  Express on Cloud Run  ──▶  Gemini Vision (extract)
   form / results         /api/recommendations  ──▶  Firestore (read/write)
   upload / confirm       /api/menus/extract
                          /api/menus/save
```

## Components

### Frontend (React + Vite)
- **Search form:** building (3 options), diet (vegetarian only to start), budget ($), minutes until class.
- **Results list:** restaurant, item, price, total time.
- **Upload panel:** choose an image, show the extracted items as editable rows, then a Confirm button.
- Config: `VITE_API_URL` and the Firebase config in `.env.local`.

### Backend (Node/Express, Cloud Run)
| Endpoint | Does |
|---|---|
| `POST /api/recommendations` | Body `{building, diet, budget, minutesUntilClass}`. Reads Firestore, filters, ranks, returns the list. |
| `POST /api/menus/extract` | Body `{restaurantId, imageBase64, mimeType}`. Calls Gemini Vision and returns the items as JSON. Does not save. |
| `POST /api/menus/save` | Body `{restaurantId, items[]}`. Writes the confirmed items to `menuItems` with `source: "gemini-scan"` and `confirmedAt`. |

### Gemini
- Called from the backend only. `GEMINI_API_KEY` is in env.
- The prompt asks for JSON only: `[{ "name", "price", "vegetarian", "vegan" }]`.
- The backend strips any code fences, parses the JSON, and checks the types before returning.
- Gemini is the data pipeline here, not a chatbot: photo → structured data → Firestore → rankings.

### Firestore
```
restaurants/{id}
  name, walkTimes: { <building>: min }, walkTimeToClass: min, prepTime: min
restaurants/{id}/menuItems/{id}
  name, price, vegetarian, vegan, source, confirmedAt
```
No transactions and no nested queries. Read each restaurant's items with one collection get.

## Ranking
```
for each restaurant × item:
  skip if item.price > budget
  skip if diet == vegetarian and !item.vegetarian
  total = walkTimes[building] + prepTime + walkTimeToClass
  skip if total > minutesUntilClass
sort ascending by total
```

## Hardcoded Data
3 buildings × 3 restaurants. Walk times are static, so they are seeded into Firestore once by a seed script.

| Building | Restaurant A | Restaurant B | Restaurant C |
|---|---|---|---|
| TBD-1 | TBD min | TBD min | TBD min |
| TBD-2 | TBD min | TBD min | TBD min |
| TBD-3 | TBD min | TBD min | TBD min |

Also TBD: restaurant names, `prepTime`, and the walk time from each restaurant to the demo class building. Seed 2 vegetarian items under the demo restaurant so the first search returns 2 results. The photo scan then adds the third.

## Config
`.env.local` (frontend) holds `VITE_API_URL` and the Firebase web config. Backend env holds `GEMINI_API_KEY` and the Firebase project credentials. No keys in code.

## Fallbacks (cut in this order)
1. Diet filters → vegetarian only
2. Ranking → filter by budget, sort by time
3. Restaurants → 2 instead of 3
4. Firestore → localStorage + seeded data
5. Cloud Run → local `npm start`, or a client-side Gemini call

| Failure | Fix |
|---|---|
| Gemini down | Return a hardcoded sample extraction |
| Firestore write fails | localStorage |
| Cloud Run slow or broken | Run the backend locally |
| Upload broken | Hardcoded base64 menu image |

## Out of Scope
Auth, tests, CI/CD, Docker, security hardening, monitoring, wait-time reporting, restaurant self-service menus, more diets.
