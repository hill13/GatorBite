import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { restaurants, menuItems, buildings } from "./data.js";

// Credentials: FIREBASE_SERVICE_ACCOUNT_JSON env var (for hosting) or backend/serviceAccountKey.json (local).
// With neither, the shared data from data.js is served read-only.
const KEY_PATH = process.env.FIREBASE_KEY_PATH || new URL("./serviceAccountKey.json", import.meta.url);
const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (fs.existsSync(KEY_PATH) ? fs.readFileSync(KEY_PATH, "utf-8") : null);
export const usingFirestore = Boolean(keyJson);

let db;
if (usingFirestore) {
  initializeApp({ credential: cert(JSON.parse(keyJson)) });
  db = getFirestore();
}
console.log(usingFirestore ? "Storage: Firestore" : "Storage: in-memory, read-only (no Firebase credentials)");

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const needFirestore = () => {
  if (!usingFirestore) throw new Error("Saving needs Firestore credentials on the server");
};

// Firestore's free plan has a daily read limit, and a menu read costs one read per dish. So shared data is cached
// in the server for a few minutes, and if Firestore refuses (quota or outage) we fall back to the built-in menus.
const SHARED_TTL = 5 * 60 * 1000;
const USER_TTL = 30 * 1000;
let sharedCache = { at: 0, data: null };
const userCache = new Map(); // uid -> { at, data }

const builtIn = () => restaurants.map((r) => ({ ...r, items: menuItems[r.id] || [] }));

// Shared restaurants (everyone sees these): [{ id, name, walkTimes, prepTime, items }]
async function getShared() {
  if (!usingFirestore) return builtIn();
  if (sharedCache.data && Date.now() - sharedCache.at < SHARED_TTL) return sharedCache.data;
  try {
    const snap = await db.collection("restaurants").get();
    const data = await Promise.all(
      snap.docs.map(async (d) => {
        const items = await d.ref.collection("menuItems").get();
        return { id: d.id, ...d.data(), items: items.docs.map((i) => i.data()) };
      })
    );
    sharedCache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.error("Firestore read failed, serving built-in menus:", err.message);
    return sharedCache.data || builtIn(); // an old cache beats nothing
  }
}

// The signed-in user's private data (users/{uid}/buildings, /restaurants, /walks, /items), cached briefly.
async function getUserData(uid) {
  const hit = userCache.get(uid);
  if (hit && Date.now() - hit.at < USER_TTL) return hit.data;
  try {
    const u = db.collection("users").doc(uid);
    const [b, r, w, i] = await Promise.all(["buildings", "restaurants", "walks", "items"].map((c) => u.collection(c).get()));
    const data = {
      buildings: b.docs.map((d) => d.data().name),
      restaurants: r.docs.map((d) => ({ id: d.id, name: d.data().name, prepTime: d.data().prepTime })),
      walks: w.docs.map((d) => d.data()),
      items: i.docs.map((d) => d.data()),
    };
    userCache.set(uid, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return hit.data; // an old copy (which includes this session's writes) beats nothing
    throw err;
  }
}

// After a successful write, add it to the cached copy too, so it shows up even if Firestore reads are refused.
// With no cached copy yet, start an already-expired one: the next read tries Firestore again.
function remember(uid, change) {
  const hit = userCache.get(uid) || { at: 0, data: { buildings: [], restaurants: [], walks: [], items: [] } };
  change(hit.data);
  userCache.set(uid, hit);
}

// What one visitor sees: the shared places plus (if signed in) their own.
export async function getView(uid) {
  const shared = (await getShared()).map((r) => ({ ...r, walkTimes: { ...r.walkTimes }, mine: false }));
  const view = {
    buildings: [...buildings],
    restaurants: shared,
    shared: [...buildings, ...shared.map((r) => r.name)],
  };
  if (!uid || !usingFirestore) return view;

  let mine;
  try {
    mine = await getUserData(uid);
  } catch (err) {
    console.error("Could not read private data, showing shared places only:", err.message);
    return view;
  }
  view.buildings.push(...mine.buildings);
  for (const r of mine.restaurants) {
    view.restaurants.push({ id: "u-" + r.id, name: r.name, prepTime: r.prepTime ?? 5, walkTimes: {}, items: [], mine: true });
  }
  const byId = new Map(view.restaurants.map((x) => [x.id, x]));
  for (const w of mine.walks) {
    if (byId.has(w.restaurantId)) byId.get(w.restaurantId).walkTimes[w.building] = w.minutes;
  }
  for (const { restaurantId, ...item } of mine.items) byId.get(restaurantId)?.items.push(item);
  return view;
}

const walkId = (building, restaurantId) => `${slug(building)}__${restaurantId}`;

// walks: [{ building, minutes }]. New restaurants start with no items; items come from the photo scan.
export async function addUserRestaurant(uid, { name, walks }) {
  needFirestore();
  const id = slug(name);
  const u = db.collection("users").doc(uid);
  const batch = db.batch();
  batch.set(u.collection("restaurants").doc(id), { name, prepTime: 5 });
  for (const w of walks) {
    batch.set(u.collection("walks").doc(walkId(w.building, "u-" + id)), { building: w.building, restaurantId: "u-" + id, minutes: w.minutes });
  }
  await batch.commit();
  remember(uid, (d) => {
    d.restaurants.push({ id, name, prepTime: 5 });
    d.walks.push(...walks.map((w) => ({ building: w.building, restaurantId: "u-" + id, minutes: w.minutes })));
  });
  return { id: "u-" + id, name };
}

// walks: [{ restaurantId, minutes }]
export async function addUserBuilding(uid, { name, walks }) {
  needFirestore();
  const u = db.collection("users").doc(uid);
  const batch = db.batch();
  batch.set(u.collection("buildings").doc(slug(name)), { name });
  for (const w of walks) {
    batch.set(u.collection("walks").doc(walkId(name, w.restaurantId)), { building: name, restaurantId: w.restaurantId, minutes: w.minutes });
  }
  await batch.commit();
  remember(uid, (d) => {
    d.buildings.push(name);
    d.walks.push(...walks.map((w) => ({ building: name, restaurantId: w.restaurantId, minutes: w.minutes })));
  });
  return { name };
}

// Scanned items are private to the signed-in user, even for the shared restaurants.
export async function saveUserItems(uid, restaurantId, items) {
  needFirestore();
  const col = db.collection("users").doc(uid).collection("items");
  const batch = db.batch();
  for (const i of items) {
    batch.set(col.doc(), { ...i, restaurantId, source: "gemini-scan", confirmedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  remember(uid, (d) => d.items.push(...items.map((i) => ({ ...i, restaurantId, source: "gemini-scan" }))));
}

// One schedule per user: users/{uid}/schedule/current = { classes: [...] }. Saving replaces the old one.
// The last saved or read schedule is kept in memory, so suggestions still work if Firestore reads are refused.
const scheduleCache = new Map();

export async function getSchedule(uid) {
  if (!usingFirestore) return scheduleCache.get(uid) || [];
  try {
    const doc = await db.collection("users").doc(uid).collection("schedule").doc("current").get();
    const classes = doc.exists ? doc.data().classes || [] : [];
    scheduleCache.set(uid, classes);
    return classes;
  } catch (err) {
    console.error("Could not read schedule, using the last known copy:", err.message);
    return scheduleCache.get(uid) || [];
  }
}

export async function saveSchedule(uid, classes) {
  needFirestore();
  await db.collection("users").doc(uid).collection("schedule").doc("current").set({ classes, updatedAt: FieldValue.serverTimestamp() });
  scheduleCache.set(uid, classes);
}

// Seed script: `npm run seed` copies data.js into Firestore (shared places only; user data is left alone).
export async function seed() {
  if (!usingFirestore) throw new Error("No Firebase credentials found");
  for (const r of restaurants) {
    const { id, ...fields } = r;
    const ref = db.collection("restaurants").doc(id);
    await ref.set(fields);
    for (const old of (await ref.collection("menuItems").get()).docs) await old.ref.delete();
    for (const item of menuItems[id] || []) await ref.collection("menuItems").add({ ...item, source: "seed" });
  }
  // remove shared restaurants that are not in data.js (older test restaurants)
  const keep = new Set(restaurants.map((r) => r.id));
  for (const d of (await db.collection("restaurants").get()).docs) {
    if (keep.has(d.id)) continue;
    for (const i of (await d.ref.collection("menuItems").get()).docs) await i.ref.delete();
    await d.ref.delete();
  }
  console.log("Seeded", restaurants.length, "restaurants");
}
