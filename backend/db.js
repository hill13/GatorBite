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

// Returns [{ id, name, walkTimes, prepTime, walkTimeToClass, items: [...] }]
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
  console.log("Seeded", restaurants.length, "restaurants");
}
