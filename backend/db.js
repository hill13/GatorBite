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

// Shared restaurants (everyone sees these): [{ id, name, walkTimes, prepTime, items }]
async function getShared() {
  if (!usingFirestore) return restaurants.map((r) => ({ ...r, items: menuItems[r.id] || [] }));
  const snap = await db.collection("restaurants").get();
  return Promise.all(
    snap.docs.map(async (d) => {
      const items = await d.ref.collection("menuItems").get();
      return { id: d.id, ...d.data(), items: items.docs.map((i) => i.data()) };
    })
  );
}

// What one visitor sees: the shared places plus (if signed in) their own.
// users/{uid}/buildings, /restaurants, /walks, /items hold the private part.
export async function getView(uid) {
  const shared = (await getShared()).map((r) => ({ ...r, walkTimes: { ...r.walkTimes }, mine: false }));
  const view = {
    buildings: [...buildings],
    restaurants: shared,
    shared: [...buildings, ...shared.map((r) => r.name)],
  };
  if (!uid || !usingFirestore) return view;

  const u = db.collection("users").doc(uid);
  const [b, r, w, i] = await Promise.all(["buildings", "restaurants", "walks", "items"].map((c) => u.collection(c).get()));
  view.buildings.push(...b.docs.map((d) => d.data().name));
  for (const d of r.docs) {
    view.restaurants.push({ id: "u-" + d.id, name: d.data().name, prepTime: d.data().prepTime ?? 5, walkTimes: {}, items: [], mine: true });
  }
  const byId = new Map(view.restaurants.map((x) => [x.id, x]));
  for (const d of w.docs) {
    const { building, restaurantId, minutes } = d.data();
    if (byId.has(restaurantId)) byId.get(restaurantId).walkTimes[building] = minutes;
  }
  for (const d of i.docs) {
    const { restaurantId, ...item } = d.data();
    byId.get(restaurantId)?.items.push(item);
  }
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
