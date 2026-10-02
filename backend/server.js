import "dotenv/config";
import express from "express";
import cors from "cors";
import { extractMenu } from "./gemini.js";
import { buildings } from "./data.js";
import { getRestaurants, listRestaurants, addRestaurant, saveItems } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => res.send("GatorBite API ok"));

app.get("/api/meta", async (_req, res) => res.json({ buildings, restaurants: await listRestaurants() }));

// Add a restaurant: name + walk minutes from each building
app.post("/api/restaurants", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const walkTimes = {};
  for (const b of buildings) {
    const m = Number(req.body.walkTimes?.[b]);
    if (!Number.isFinite(m) || m <= 0) return res.status(400).json({ error: `Walk time from ${b} must be a positive number` });
    walkTimes[b] = m;
  }
  if (!name) return res.status(400).json({ error: "Name required" });
  const created = await addRestaurant({ name, walkTimes });
  if (!created) return res.status(400).json({ error: "That restaurant already exists" });
  res.json(created);
});

// Ranking: filter by budget + diet, total = walk to food + prep + walk to class building
app.post("/api/recommendations", async (req, res) => {
  const { building, destination, diet, budget, minutesUntilClass, restaurantIds } = req.body;
  const results = [];
  for (const r of await getRestaurants()) {
    if (restaurantIds && !restaurantIds.includes(r.id)) continue;
    const walkTo = r.walkTimes[building];
    const walkToClass = r.walkTimes[destination || building];
    if (walkTo === undefined || walkToClass === undefined) continue;
    const total = walkTo + r.prepTime + walkToClass;
    if (total > minutesUntilClass) continue;
    for (const item of r.items) {
      if (item.price > budget) continue;
      if (diet === "vegetarian" && !item.vegetarian) continue;
      if (diet === "vegan" && !item.vegan) continue;
      results.push({ restaurant: r.name, ...item, totalMinutes: total });
    }
  }
  results.sort((a, b) => a.totalMinutes - b.totalMinutes);
  res.json(results);
});

// Photo -> Gemini -> structured items (does not save; the user confirms first)
app.post("/api/menus/extract", async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });
  res.json(await extractMenu(imageBase64, mimeType));
});

// Confirmed items -> Firestore (or memory if no key file)
app.post("/api/menus/save", async (req, res) => {
  const { restaurantId, items } = req.body;
  try {
    if (!(await saveItems(restaurantId, items))) return res.status(400).json({ error: "unknown restaurant" });
    res.json({ saved: items.length });
  } catch (err) {
    console.error("save failed:", err.message);
    res.status(500).json({ error: "save failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`GatorBite API on :${port}`));
