// Wipe one account's private data (added restaurants, scanned menus, saved schedule) before a demo.
// Usage: npm run reset-user -- you@gmail.com     (an email or a Firebase uid)
import "dotenv/config";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { usingFirestore } from "./db.js"; // initializes firebase-admin

const who = process.argv[2];
if (!who || !usingFirestore) {
  console.error("Usage: npm run reset-user -- you@gmail.com   (needs Firebase credentials)");
  process.exit(1);
}
try {
  const uid = who.includes("@") ? (await getAuth().getUserByEmail(who)).uid : who;
  const ref = getFirestore().collection("users").doc(uid);
  const counts = {};
  for (const c of ["restaurants", "walks", "items", "schedule"]) counts[c] = (await ref.collection(c).get()).size;
  await getFirestore().recursiveDelete(ref);
  console.log("Reset", who, "- removed:", JSON.stringify(counts));
  process.exit(0);
} catch (err) {
  console.error("Could not reset:", err.message);
  process.exit(1);
}
