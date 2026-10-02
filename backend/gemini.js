import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const PROMPT = `You are reading a photo of a restaurant menu.
Return ONLY a JSON array. Each element: {"name": string, "price": number, "vegetarian": boolean, "vegan": boolean}.
- price is a plain number in dollars (no $ sign). Skip items with no price.
- vegetarian/vegan: true only if clearly meatless/plant-based from the name or description.
- Include EVERY meal or dish that has a price (up to 60). Skip add-ons, extras, toppings, condiments and drinks. No commentary.`;

// Used when no API key is set or Gemini fails, so the demo never breaks.
export const SAMPLE_ITEMS = [
  { name: "Veggie Burrito", price: 8.99, vegetarian: true, vegan: false },
  { name: "Falafel Wrap", price: 9.25, vegetarian: true, vegan: true },
  { name: "Chicken Quesadilla", price: 10.5, vegetarian: false, vegan: false },
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
