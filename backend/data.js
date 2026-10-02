// In-memory seed data. Names are real; ALL MINUTES ARE PLACEHOLDER GUESSES (replace with real walk/prep times).
export const buildings = ["Thornton Hall", "SFSU Library", "Mashouff Wellness Center"];
export const destination = "Thornton Hall";

export const restaurants = [
  { id: "cafe-rosso", name: "Cafe Rosso", walkTimes: { "Thornton Hall": 5, "SFSU Library": 4, "Mashouff Wellness Center": 6 }, prepTime: 8, walkTimeToClass: 5 },
  { id: "carmelinas", name: "Carmelina's Cafe", walkTimes: { "Thornton Hall": 4, "SFSU Library": 6, "Mashouff Wellness Center": 7 }, prepTime: 6, walkTimeToClass: 4 },
  { id: "taza", name: "Taza Smoothies and Wraps", walkTimes: { "Thornton Hall": 7, "SFSU Library": 5, "Mashouff Wellness Center": 3 }, prepTime: 5, walkTimeToClass: 6 },
];

// Placeholder items so the first search returns 2 results; the scan adds the third.
export const menuItems = {
  "cafe-rosso": [{ name: "Veggie Wrap", price: 9.5, vegetarian: true, vegan: false }],
  carmelinas: [{ name: "Caprese Sandwich", price: 10.5, vegetarian: true, vegan: false }],
  taza: [{ name: "Chicken Wrap", price: 8, vegetarian: false, vegan: false }],
};
