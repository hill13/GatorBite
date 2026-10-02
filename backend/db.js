import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { restaurants, menuItems } from "./data.js";

// Firestore if serviceAccountKey.json exists, otherwise the in-memory data from data.js.
const KEY_PATH = process.env.FIREBASE_KEY_PATH || new URL("./serviceAccountKey.json", import.meta.url);
export const usingFirestore = fs.existsSync(KEY_PATH);

let db;
if (usingFirestore) {
  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(KEY_PATH, "utf-8"))) });
  db = getFirestore();
}
console.log(usingFirestore ? "Storage: Firestore" : "Storage: in-memory (no serviceAccountKey.json)");

// Returns [{ id, name, walkTimes, prepTime, items: [...] }]
export async function getRestaurants() {
  if (!usingFirestore) return restaurants.map((r) => ({ ...r, items: menuItems[r.id] || [] }));
  const snap = await db.collection("restaurants").get();
  return Promise.all(
    snap.docs.map(async (d) => {
      const items = await d.ref.collection("menuItems").get();
      return { id: d.id, ...d.data(), items: items.docs.map((i) => i.data()) };
    })
  );
}

// Lightweight list for dropdowns: [{ id, name }]
export async function listRestaurants() {
  if (!usingFirestore) return restaurants.map(({ id, name }) => ({ id, name }));
  const snap = await db.collection("restaurants").get();
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
}

// New restaurants start with no menu items; items come from the photo scan.
export async function addRestaurant({ name, walkTimes }) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant";
  const doc = { name, walkTimes, prepTime: 5 };
  if (!usingFirestore) {
    if (restaurants.some((r) => r.id === id)) return null;
    restaurants.push({ id, ...doc });
    menuItems[id] = [];
    return { id, name };
  }
  const ref = db.collection("restaurants").doc(id);
  if ((await ref.get()).exists) return null;
  await ref.set(doc);
  return { id, name };
}

export async function saveItems(restaurantId, items) {
  if (!usingFirestore) {
    if (!menuItems[restaurantId]) return false;
    menuItems[restaurantId].push(...items.map((i) => ({ ...i, source: "gemini-scan", confirmedAt: Date.now() })));
    return true;
  }
  const ref = db.collection("restaurants").doc(restaurantId);
  if (!(await ref.get()).exists) return false;
  const batch = db.batch();
  for (const i of items) {
    batch.set(ref.collection("menuItems").doc(), { ...i, source: "gemini-scan", confirmedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  return true;
}

// Seed script: `npm run seed` copies data.js into Firestore (wipes menuItems first so it is repeatable).
export async function seed() {
  if (!usingFirestore) throw new Error("No serviceAccountKey.json found");
  for (const r of restaurants) {
    const { id, ...fields } = r;
    const ref = db.collection("restaurants").doc(id);
    await ref.set(fields);
    for (const old of (await ref.collection("menuItems").get()).docs) await old.ref.delete();
    for (const item of menuItems[id] || []) await ref.collection("menuItems").add({ ...item, source: "seed" });
  }
  // remove restaurants that were added through the UI so the seed is a clean reset
  const keep = new Set(restaurants.map((r) => r.id));
  for (const d of (await db.collection("restaurants").get()).docs) {
    if (keep.has(d.id)) continue;
    for (const i of (await d.ref.collection("menuItems").get()).docs) await i.ref.delete();
    await d.ref.delete();
  }
  console.log("Seeded", restaurants.length, "restaurants");
}
