import "dotenv/config";
import express from "express";
import cors from "cors";
import { extractMenu, extractSchedule } from "./gemini.js";
import { optionalUser, requireUser } from "./auth.js";
import { getView, addUserRestaurant, addUserBuilding, saveUserItems, getSchedule, saveSchedule } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => res.send("GatorBite API ok"));

// What this visitor can see: the shared places, plus their own if signed in.
app.get("/api/meta", optionalUser, async (req, res) => {
  const v = await getView(req.user?.uid);
  res.json({
    buildings: v.buildings,
    restaurants: v.restaurants.map(({ id, name, mine }) => ({ id, name, mine })),
    shared: v.shared,
    signedIn: Boolean(req.user),
  });
});

// Keep only walk entries with a known place and a positive number of minutes.
const cleanWalks = (list, key, allowed) =>
  (Array.isArray(list) ? list : [])
    .map((w) => ({ [key]: w[key], minutes: Number(w.minutes) }))
    .filter((w) => allowed.includes(w[key]) && Number.isFinite(w.minutes) && w.minutes > 0);

const taken = (names, name) => names.some((n) => n.toLowerCase() === name.toLowerCase());

// Add a restaurant (private to the user). Needs a walk time from at least one building.
app.post("/api/restaurants", requireUser, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });
  const v = await getView(req.user.uid);
  if (taken(v.restaurants.map((r) => r.name), name)) return res.status(400).json({ error: "You already have a restaurant with that name" });
  const walks = cleanWalks(req.body.walks, "building", v.buildings);
  if (!walks.length) return res.status(400).json({ error: "Add the walking time from at least one building" });
  try {
    res.json(await addUserRestaurant(req.user.uid, { name, walks }));
  } catch (err) {
    console.error("add restaurant failed:", err.message);
    res.status(500).json({ error: "Could not save" });
  }
});

// Add a building / class location (private to the user). Needs a walk time to at least one restaurant.
app.post("/api/buildings", requireUser, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });
  const v = await getView(req.user.uid);
  if (taken(v.buildings, name)) return res.status(400).json({ error: "You already have a building with that name" });
  const walks = cleanWalks(req.body.walks, "restaurantId", v.restaurants.map((r) => r.id));
  if (!walks.length) return res.status(400).json({ error: "Add the walking time to at least one restaurant" });
  try {
    res.json(await addUserBuilding(req.user.uid, { name, walks }));
  } catch (err) {
    console.error("add building failed:", err.message);
    res.status(500).json({ error: "Could not save" });
  }
});

// Does a dish fit one diet option? All selected options must fit. Unknown tags are never treated as safe.
const fits = (item, diet) => {
  switch (diet) {
    case "vegetarian": return Boolean(item.vegetarian);
    case "vegan": return Boolean(item.vegan);
    case "halal": return !item.pork && !item.alcohol; // "halal-friendly": menus can't prove certification
    case "no-pork": return !item.pork;
    case "no-beef": return !item.beef;
    case "gluten-free": return item.gluten === false;
    case "nut-free": return item.nuts === false;
    default: return true;
  }
};

// Ranking: filter by budget + diet, total = walk to food + prep + walk to class building.
// Used by both search and the schedule planner. `minutes` is the time available.
function rank(view, { building, destination, diets, budget, minutes, restaurantIds }) {
  const results = [];
  for (const r of view.restaurants) {
    if (restaurantIds && !restaurantIds.includes(r.id)) continue;
    const walkTo = r.walkTimes[building];
    const walkToClass = r.walkTimes[destination || building];
    if (walkTo === undefined || walkToClass === undefined) continue;
    const total = walkTo + r.prepTime + walkToClass;
    if (total > minutes) continue;
    for (const item of r.items) {
      if (item.price > budget) continue;
      if (!(Array.isArray(diets) ? diets : []).every((d) => fits(item, d))) continue;
      results.push({ restaurant: r.name, ...item, totalMinutes: total });
    }
  }
  return results.sort((a, b) => a.totalMinutes - b.totalMinutes || a.price - b.price);
}

app.post("/api/recommendations", optionalUser, async (req, res) => {
  const { building, destination, diets, budget, minutesUntilClass, restaurantIds } = req.body;
  res.json(rank(await getView(req.user?.uid), { building, destination, diets, budget, minutes: minutesUntilClass, restaurantIds }));
});

// ---- class schedule ----
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EAT_MINUTES = 10; // time left to actually eat, on top of walk + prep
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

// Photo of a class schedule -> classes (not saved; the user reviews and maps buildings first)
app.post("/api/schedule/extract", requireUser, async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });
  const v = await getView(req.user.uid);
  res.json(await extractSchedule(imageBase64, mimeType, v.buildings));
});

app.get("/api/schedule", requireUser, async (req, res) => res.json({ classes: await getSchedule(req.user.uid) }));

app.post("/api/schedule/save", requireUser, async (req, res) => {
  const v = await getView(req.user.uid);
  const classes = (Array.isArray(req.body.classes) ? req.body.classes : [])
    .map((c) => ({
      course: String(c.course || "Class").trim(),
      day: c.day,
      start: String(c.start || ""),
      end: String(c.end || ""),
      location: String(c.location || ""),
      building: c.building,
    }))
    .filter((c) => DAYS.includes(c.day) && /^\d\d:\d\d$/.test(c.start) && /^\d\d:\d\d$/.test(c.end) && c.end > c.start && v.buildings.includes(c.building));
  if (!classes.length) return res.status(400).json({ error: "Pick a building for at least one class" });
  try {
    await saveSchedule(req.user.uid, classes);
    res.json({ saved: classes.length, classes });
  } catch (err) {
    console.error("save schedule failed:", err.message);
    res.status(500).json({ error: "Could not save" });
  }
});

// For each gap between consecutive classes on a day: the best 3 places (one dish each) that fit.
app.post("/api/schedule/suggest", requireUser, async (req, res) => {
  const { diets, budget } = req.body;
  const [view, classes] = await Promise.all([getView(req.user.uid), getSchedule(req.user.uid)]);
  const days = [];
  for (const day of DAYS) {
    const todays = classes.filter((c) => c.day === day).sort((a, b) => a.start.localeCompare(b.start));
    const gaps = [];
    for (let i = 0; i + 1 < todays.length; i++) {
      const a = todays[i];
      const b = todays[i + 1];
      const minutes = toMin(b.start) - toMin(a.end);
      if (minutes <= 0) continue;
      // best 3 restaurants by trip time; for each, up to 2 real meals (dishes $6+, else whatever it has)
      const byRestaurant = new Map();
      for (const r of rank(view, { building: a.building, destination: b.building, diets, budget: Number(budget) || 1000, minutes: minutes - EAT_MINUTES })) {
        if (!byRestaurant.has(r.restaurant)) byRestaurant.set(r.restaurant, { restaurant: r.restaurant, totalMinutes: r.totalMinutes, items: [] });
        byRestaurant.get(r.restaurant).items.push(r);
      }
      const options = [...byRestaurant.values()].slice(0, 3).map((o) => {
        const meals = o.items.filter((i) => i.price >= 6);
        const dishes = (meals.length ? meals : o.items).sort((x, y) => y.price - x.price).slice(0, 2);
        return { restaurant: o.restaurant, totalMinutes: o.totalMinutes, spare: minutes - o.totalMinutes, dishes: dishes.map((d) => ({ name: d.name, price: d.price })) };
      });
      gaps.push({ after: a.course, before: b.course, from: a.end, to: b.start, minutes, fromBuilding: a.building, toBuilding: b.building, options });
    }
    if (todays.length) days.push({ day, classCount: todays.length, gaps });
  }
  res.json({ eatMinutes: EAT_MINUTES, days });
});

// Photo -> Gemini -> structured items (does not save; the user confirms first)
app.post("/api/menus/extract", requireUser, async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });
  res.json(await extractMenu(imageBase64, mimeType));
});

// Confirmed items -> Firestore, private to the signed-in user
app.post("/api/menus/save", requireUser, async (req, res) => {
  const { restaurantId, items } = req.body;
  const v = await getView(req.user.uid);
  if (!v.restaurants.some((r) => r.id === restaurantId)) return res.status(400).json({ error: "unknown restaurant" });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "no items to save" });
  try {
    await saveUserItems(req.user.uid, restaurantId, items);
    res.json({ saved: items.length });
  } catch (err) {
    console.error("save failed:", err.message);
    res.status(500).json({ error: "save failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`GatorBite API on :${port}`));
