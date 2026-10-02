import "dotenv/config";
import express from "express";
import cors from "cors";
import { extractMenu } from "./gemini.js";
import { restaurants, buildings, destination } from "./data.js";
import { getRestaurants, saveItems } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => res.send("GatorBite API ok"));

app.get("/api/meta", (_req, res) =>
  res.json({ buildings, destination, restaurants: restaurants.map(({ id, name }) => ({ id, name })) })
);

// Ranking: filter by budget + diet, total = walk to food + prep + walk to class
app.post("/api/recommendations", async (req, res) => {
  const { building, diet, budget, minutesUntilClass } = req.body;
  const results = [];
  for (const r of await getRestaurants()) {
    const walkTo = r.walkTimes[building];
    if (walkTo === undefined) continue;
    const total = walkTo + r.prepTime + r.walkTimeToClass;
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
