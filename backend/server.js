import "dotenv/config";
import express from "express";
import cors from "cors";
import { restaurants, menuItems, buildings, destination } from "./data.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => res.send("GatorBite API ok"));

app.get("/api/meta", (_req, res) =>
  res.json({ buildings, destination, restaurants: restaurants.map(({ id, name }) => ({ id, name })) })
);

// Ranking: filter by budget + diet, total = walk to food + prep + walk to class
app.post("/api/recommendations", (req, res) => {
  const { building, diet, budget, minutesUntilClass } = req.body;
  const results = [];
  for (const r of restaurants) {
    const walkTo = r.walkTimes[building];
    if (walkTo === undefined) continue;
    const total = walkTo + r.prepTime + r.walkTimeToClass;
    if (total > minutesUntilClass) continue;
    for (const item of menuItems[r.id] || []) {
      if (item.price > budget) continue;
      if (diet === "vegetarian" && !item.vegetarian) continue;
      if (diet === "vegan" && !item.vegan) continue;
      results.push({ restaurant: r.name, ...item, totalMinutes: total });
    }
  }
  results.sort((a, b) => a.totalMinutes - b.totalMinutes);
  res.json(results);
});

// STUB: swapped for Gemini on feat/gemini-extract
app.post("/api/menus/extract", (_req, res) => {
  res.json({
    items: [{ name: "Veggie Burrito", price: 8.99, vegetarian: true, vegan: false }],
  });
});

// STUB: swapped for Firestore on feat/firestore
app.post("/api/menus/save", (req, res) => {
  const { restaurantId, items } = req.body;
  if (!menuItems[restaurantId]) return res.status(400).json({ error: "unknown restaurant" });
  menuItems[restaurantId].push(
    ...items.map((i) => ({ ...i, source: "gemini-scan", confirmedAt: Date.now() }))
  );
  res.json({ saved: items.length });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`GatorBite API on :${port}`));
