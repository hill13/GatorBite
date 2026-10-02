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
