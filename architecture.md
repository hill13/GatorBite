# GatorBite Architecture

## What it does
A student says where they are, where their next class is, how many minutes they have, their budget and diet. GatorBite returns food ranked by **total time = walk to the restaurant + prep + walk to class**. Gemini turns photos of menus and class schedules into structured data, so new dishes and eating windows appear without anyone typing a menu.

## Pieces
```
React site (Vercel)  ──HTTPS──▶  Express API (Render)  ──▶  Firestore   (shared + private data)
 #/  #/plan  #/restaurants         /api/*                 └─▶  Gemini     (menu + schedule photos)
        │                                                └─▶  Firebase Auth (verify sign-in tokens)
        └── Firebase Auth (email link / Google) ─── ID token sent as `Authorization: Bearer ...`
```
- **Frontend:** `frontend/` (Vite, React, Tailwind). Three pages with `#/` routes: Home (sign-in + search), Plan your day, Add a restaurant.
- **Backend:** `backend/` (Node, Express). `server.js` routes, `db.js` Firestore access, `auth.js` token check, `gemini.js` Gemini calls.
- **Hosting:** API on Render (`render.yaml`), site on Vercel. See `DEPLOY.md`.

## API
| Endpoint | Auth | Does |
|---|---|---|
| `GET /api/meta` | optional | Buildings and restaurants this visitor can see (shared, plus their own if signed in). |
| `POST /api/recommendations` | optional | Ranks dishes for `{building, destination, diets[], budget, minutesUntilClass, restaurantIds}`. |
| `POST /api/restaurants` | required | Adds a private restaurant with walking minutes from at least one building. |
| `POST /api/menus/extract` | required | Menu photo to dishes with diet tags (Gemini). Does not save. |
| `POST /api/menus/save` | required | Saves the dishes the user confirmed, privately. |
| `POST /api/schedule/extract` | required | Class schedule photo to classes, mapped to buildings (Gemini). Does not save. |
| `GET/POST /api/schedule`, `/api/schedule/save` | required | Read or replace the saved schedule. |
| `POST /api/schedule/suggest` | required | For each gap between classes, the best 3 restaurants that fit. |

## Data (Firestore)
```
restaurants/{id}                     shared: name, walkTimes{building: min}, prepTime
restaurants/{id}/menuItems/{id}      shared: name, price, vegetarian, vegan, pork, beef, alcohol, gluten, nuts
users/{uid}/restaurants/{id}         private restaurant: name, prepTime
users/{uid}/walks/{building__rid}    private walking time: building, restaurantId, minutes
users/{uid}/items/{id}               private scanned dish (any restaurant, shared or private)
users/{uid}/schedule/current         classes[]: course, day, start, end, building
```
The 13 campus buildings and the seed data live in `backend/data.js`. `npm run seed` copies the shared part into Firestore.

## How the main loops work
- **Search:** for each visible restaurant, `total = walkTimes[from] + prep + walkTimes[to]`. Skip it if the total exceeds the minutes. Keep dishes under budget that pass every selected diet. Sort by total time, then meals before sides.
- **Menu scan:** photo, then Gemini returns JSON for every dish with tags. The backend cleans it. The user reviews and edits, then confirms, and it is saved to their private items. The next search includes it.
- **Schedule:** photo, then Gemini returns classes and matches each to a building. The user fixes unmatched ones and saves. For each gap between two classes, the planner runs the same ranking from the first class's building to the next, with `gap minus 10 minutes to eat` as the time limit. It shows the top 3 restaurants with up to 2 real meals each.

## Trust and safety choices
- **Unknown is never safe.** A dish passes gluten-free or nut-free only if explicitly tagged clean. Gemini is told to answer "contains" for gluten, nuts, pork and beef when unsure.
- **Human in the loop.** Every Gemini result is reviewed before it is saved.
- **Labelled honestly.** Halal-friendly means no pork or alcohol. It is not a certification, and the app says to confirm with the restaurant.
- **Login.** Email-link sign-in (proves an inbox) or Google. Allowed: `@sfsu.edu` plus `ALLOWED_EMAILS`. The server verifies the Firebase ID token on every write. Search is public.
- **Private by default.** Added restaurants, scanned dishes and schedules are visible only to their owner.
- **Secrets** live only in env vars (`GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`) and git-ignored files.

## Known limits
- Walking times are hand-entered: Thornton Hall, SFSU Library and Mashouf were measured, the other 10 buildings are estimates. Gemini guesses were 2 to 3 times too low, so they are not used.
- Prep time is a flat 5 minutes. Menus and tags for Carmelina's and Taza come from photos and are less certain than Rosso's.
- Free-tier hosting: the API sleeps when idle and wakes in under a minute.
- Demo-day switch: `AUTH_DISABLED=true` (API) and `VITE_AUTH_DISABLED=true` (site) turn the login off.
