// In-memory seed data. Walk times are real (from Hill). prepTime is a flat 5 min for all; menu items are STILL PLACEHOLDERS.
export const buildings = ["Thornton Hall", "SFSU Library", "Mashouff Wellness Center"];
export const destination = "Thornton Hall";

export const restaurants = [
  { id: "cafe-rosso", name: "Cafe Rosso", walkTimes: { "Thornton Hall": 6, "SFSU Library": 6, "Mashouff Wellness Center": 5 }, prepTime: 5, walkTimeToClass: 6 },
  { id: "carmelinas", name: "Carmelina's Cafe", walkTimes: { "Thornton Hall": 5, "SFSU Library": 6, "Mashouff Wellness Center": 13 }, prepTime: 5, walkTimeToClass: 5 },
  { id: "taza", name: "Taza Smoothies and Wraps", walkTimes: { "Thornton Hall": 8, "SFSU Library": 8, "Mashouff Wellness Center": 5 }, prepTime: 5, walkTimeToClass: 8 },
];

// Placeholder items so the first search returns 2 results; the scan adds the third.
export const menuItems = {
  "cafe-rosso": [{ name: "Veggie Wrap", price: 9.5, vegetarian: true, vegan: false }],
  carmelinas: [{ name: "Caprese Sandwich", price: 10.5, vegetarian: true, vegan: false }],
  taza: [{ name: "Chicken Wrap", price: 8, vegetarian: false, vegan: false }],
};
