# Deploying GatorBite

Two pieces: the **API** (`backend/`, Node) on **Render**, and the **site** (`frontend/`, Vite + React) on **Vercel**.
Data stays in Firestore and menus are read by Gemini, so both services need a few secrets. Never commit them; paste them in the dashboards.

Deploy from the `main` branch only. Do the steps in this order, because each one gives you a URL the next one needs.

## 1. Render (API)

1. render.com, **New +** then **Blueprint**, connect GitHub and pick `hill13/GatorBite`. Render reads `render.yaml` and proposes a service called `gatorbite-api` (free plan).
   - If you prefer a plain Web Service instead: root directory `backend`, build command `npm install`, start command `npm start`, Node 22, health check path `/`.
2. When it asks for the secret values (or under **Environment** afterwards), set:

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | the key from your `backend/.env` |
   | `GEMINI_VERTEX` | `true` (already set by the blueprint; keep it if your key came from the Google Cloud console) |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | open `backend/serviceAccountKey.json` and paste the **entire** contents |
   | `ALLOWED_EMAILS` | your approved personal Gmail(s), comma-separated |
   | `FRONTEND_ORIGIN` | leave empty for now; step 3 fills it in |

3. Deploy. When it's live, open `https://<your-service>.onrender.com/`. It should say `GatorBite API ok`. Copy that URL.
   `https://<your-service>.onrender.com/api/meta` should return the 13 buildings.

## 2. Vercel (site)

1. vercel.com, **Add New** then **Project**, import `hill13/GatorBite`.
2. Set **Root Directory** to `frontend`. Framework is detected as Vite (build `npm run build`, output `dist`).
3. Add these **Environment Variables** (same values as your `frontend/.env.local`):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | the Render URL from step 1, no trailing slash |
   | `VITE_FIREBASE_API_KEY` | from `frontend/.env.local` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | from `frontend/.env.local` |
   | `VITE_FIREBASE_PROJECT_ID` | from `frontend/.env.local` |
   | `VITE_FIREBASE_APP_ID` | from `frontend/.env.local` |
   | `VITE_ALLOWED_EMAILS` | the same Gmail(s) as `ALLOWED_EMAILS` on Render |

4. Deploy. Copy the site URL, for example `https://gatorbite.vercel.app`.

Vite reads `VITE_` values when it **builds**, so after changing any of them you must redeploy the site.

## 3. Connect the two

- **Render, `FRONTEND_ORIGIN`:** set it to the Vercel URL (no trailing slash) and save. Render redeploys. This lets only your site call the API.
- **Firebase console, Authentication, Settings, Authorized domains:** add your Vercel domain (for example `gatorbite.vercel.app`). Without this, the sign-in link and the Google popup fail.

## 4. Check it works (live site)

- [ ] Home page loads, and the building dropdowns are filled in (proves the API is reachable).
- [ ] **Find food** returns results.
- [ ] Sign in with your Gmail through "Email me a sign-in link" and open the link on the same device.
- [ ] **Plan your day**: upload `demo-assets/sample-schedule.png`, pick a building for HSS if asked, save, and see eating windows.
- [ ] **Add a restaurant**: add one and scan a menu photo.
- [ ] Run `npm run seed` locally before the demo, to remove any test data (it resets the shared places only).

## Demo-day notes

- **Render free sleeps** after about 15 minutes idle, and the first request can take 30 to 60 seconds. Open the site 5 minutes before the demo, and do one search to wake it.
- **If login breaks on stage:** set `AUTH_DISABLED=true` on Render and `VITE_AUTH_DISABLED=true` on Vercel, then redeploy both. Everyone then acts as one demo user.
- **If Gemini fails,** scans fall back to sample data and the screen says so.
- **Known good version:** after the dry run passes, `git tag demo-good` on `main`. To go back, redeploy that commit.

## Local run (no hosting)

```
cd backend  && npm install && npm start          # http://localhost:8080
cd frontend && npm install && npm run dev        # http://localhost:5173
```

Local secrets live in `backend/.env`, `backend/serviceAccountKey.json` and `frontend/.env.local` (all git-ignored; see the `.env.example` files).
