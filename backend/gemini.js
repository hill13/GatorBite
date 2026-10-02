import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const PROMPT = `You are reading a photo of a restaurant menu.
Return ONLY a JSON array. Each element: {"name": string, "price": number, "vegetarian": boolean, "vegan": boolean, "pork": boolean, "beef": boolean, "alcohol": boolean, "gluten": boolean, "nuts": boolean}.
- price is a plain number in dollars (no $ sign). Skip items with no price.
- vegetarian/vegan: true only if clearly meatless/plant-based from the name or description.
- pork: true if it contains or may contain pork, bacon, ham, sausage, pepperoni, prosciutto, salami, carnitas or lard.
- beef: true if it contains or may contain beef, steak, carne asada, pastrami, a beef burger patty or meatballs.
- alcohol: true if it contains wine, beer, liquor or a spirit.
- gluten: true if it contains or may contain wheat, bread, bun, bagel, tortilla, pasta, flour, breading or soy sauce. Only false if clearly gluten-free.
- nuts: true if it contains or may contain tree nuts or peanuts (almonds, cashews, pine nuts in pesto, peanut sauce, granola, Nutella). Only false if clearly nut-free.
- If the ingredients are unknown or the meat is a choice, set pork, beef, gluten and nuts to true (safer for people avoiding them).
- Include EVERY meal or dish that has a price (up to 60). Skip add-ons, extras, toppings, condiments and drinks. No commentary.`;

// Used when no API key is set or Gemini fails, so the demo never breaks.
export const SAMPLE_ITEMS = [
  { name: "Veggie Burrito", price: 8.99, vegetarian: true, vegan: false, pork: false, beef: false, alcohol: false, gluten: true, nuts: false },
  { name: "Falafel Wrap", price: 9.25, vegetarian: true, vegan: true, pork: false, beef: false, alcohol: false, gluten: true, nuts: false },
  { name: "Chicken Quesadilla", price: 10.5, vegetarian: false, vegan: false, pork: false, beef: false, alcohol: false, gluten: true, nuts: false },
];

function clean(raw) {
  const text = raw.replace(/```(?:json)?/g, "").trim();
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error("not an array");
  return arr
    .map((i) => ({
      name: String(i.name || "").trim(),
      price: Number(i.price),
      vegetarian: Boolean(i.vegetarian),
      vegan: Boolean(i.vegan),
      pork: Boolean(i.pork),
      beef: Boolean(i.beef),
      alcohol: Boolean(i.alcohol),
      gluten: i.gluten !== false, // missing or unsure counts as "contains"
      nuts: i.nuts !== false,
    }))
    .filter((i) => i.name && Number.isFinite(i.price) && i.price > 0);
}

export async function extractMenu(imageBase64, mimeType) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY: returning sample extraction");
    return { items: SAMPLE_ITEMS, source: "sample" };
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      vertexai: process.env.GEMINI_VERTEX === "true", // Vertex express keys (Google Cloud console)
    });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
        { text: PROMPT },
      ],
      config: { responseMimeType: "application/json" },
    });
    const items = clean(response.text);
    if (!items.length) throw new Error("no items found");
    return { items, source: "gemini" };
  } catch (err) {
    console.error("Gemini extract failed:", err.message);
    return { items: SAMPLE_ITEMS, source: "sample" };
  }
}

// ---- class schedule photo -> classes ----
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const schedulePrompt = (buildings) => `You are reading a photo or screenshot of a university class schedule.
Return ONLY a JSON array. Each element: {"course": string, "days": string[], "start": "HH:MM", "end": "HH:MM", "location": string, "building": string or null}.
- days uses only: Mon, Tue, Wed, Thu, Fri, Sat, Sun. M=Mon, T=Tue, W=Wed, R or Th=Thu, F=Fri. A class meeting MWF has days ["Mon","Wed","Fri"].
- start and end are 24-hour times such as 09:30 or 13:45.
- location is the building and room exactly as printed (for example "HSS 120").
- building: the ONE name from this list that best matches the location, or null if none clearly matches: ${JSON.stringify(buildings)}.
- Skip online or asynchronous classes that have no meeting time. Return at most 40 classes. No commentary.`;

const pad = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
};

function cleanSchedule(raw, buildings) {
  const arr = JSON.parse(raw.replace(/```(?:json)?/g, "").trim());
  if (!Array.isArray(arr)) throw new Error("not an array");
  const out = [];
  for (const c of arr) {
    const start = pad(c.start);
    const end = pad(c.end);
    if (!start || !end || end <= start) continue;
    const building = buildings.includes(c.building) ? c.building : null;
    for (const day of Array.isArray(c.days) ? c.days : []) {
      if (DAYS.includes(day)) {
        const location = String(c.location || "").trim();
        // "HSS 120" -> "HSS", "Thornton Hall 105" -> "Thornton Hall": a name to offer when no building matches
        const stripped = location.replace(/\s*(?:room|rm\.?)?\s*#?(?:[A-Za-z]{1,3}-)?\d+[A-Za-z]?\s*$/i, "").trim();
        const buildingGuess = /^(online|remote|tba|tbd|zoom|async)/i.test(stripped) ? "" : stripped;
        out.push({ course: String(c.course || "Class").trim(), day, start, end, location, building, buildingGuess });
      }
    }
  }
  return out;
}

export async function extractSchedule(imageBase64, mimeType, buildings) {
  const sample = () => [
    { course: "Sample Class A", day: "Mon", start: "09:00", end: "10:15", location: "", building: buildings[0] },
    { course: "Sample Class B", day: "Mon", start: "12:30", end: "13:45", location: "", building: buildings[1] || buildings[0] },
    { course: "Sample Class C", day: "Mon", start: "15:00", end: "16:15", location: "", building: buildings[0] },
  ];
  if (!process.env.GEMINI_API_KEY) return { classes: sample(), source: "sample" };
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, vertexai: process.env.GEMINI_VERTEX === "true" });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } }, { text: schedulePrompt(buildings) }],
      config: { responseMimeType: "application/json" },
    });
    const classes = cleanSchedule(response.text, buildings);
    if (!classes.length) throw new Error("no classes found");
    return { classes, source: "gemini" };
  } catch (err) {
    console.error("Gemini schedule extract failed:", err.message);
    return { classes: sample(), source: "sample" };
  }
}
