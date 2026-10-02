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
  "cafe-rosso": [
    // Real Cafe Rosso menu (meals only, full-size prices). vegan=true only where the menu says vegan.
    { name: "Ham or Turkey Croissant", price: 5.95, vegetarian: false, vegan: false },
    { name: "Mediterranean Breakfast Sandwich", price: 8.25, vegetarian: true, vegan: false },
    { name: "Bacon, Egg & Cheese Sandwich", price: 9.5, vegetarian: false, vegan: false },
    { name: "Falafel Hummus Sandwich", price: 10.95, vegetarian: true, vegan: false },
    { name: "Vegan Portobello Sandwich", price: 10.5, vegetarian: true, vegan: true },
    { name: "Basil Mozzarella Sandwich", price: 11.25, vegetarian: true, vegan: false },
    { name: "Eggplant Parm Sandwich", price: 11.5, vegetarian: true, vegan: false },
    { name: "Rosso Club", price: 11.75, vegetarian: false, vegan: false },
    { name: "Chicken Teriyaki Rice Bowl", price: 10.95, vegetarian: false, vegan: false },
    { name: "Veggie Chicken Teriyaki Rice Bowl", price: 10.95, vegetarian: true, vegan: false },
    { name: "Veggie Burger", price: 8.95, vegetarian: true, vegan: false },
    { name: "Cheeseburger", price: 8.95, vegetarian: false, vegan: false },
    { name: "Mac 'n Cheese & Garlic Bread", price: 7.95, vegetarian: true, vegan: false },
    { name: "Grilled Three Cheese", price: 9.5, vegetarian: true, vegan: false },
  ],
  carmelinas: [
    // Real Carmelina's menu (individual items only; catering dozens and drinks skipped)
    { name: "Hard Boiled Egg", price: 1.5, vegetarian: true, vegan: false },
    { name: "Fruit Salad Cup", price: 5.25, vegetarian: true, vegan: true },
    { name: "Smoked Salmon Bagel", price: 6.5, vegetarian: false, vegan: false },
    { name: "Dr. Lindsay Bagel", price: 5.75, vegetarian: false, vegan: false },
    { name: "M.C.B Bagel", price: 5.75, vegetarian: false, vegan: false },
    { name: "B.L.T Bagel", price: 5.75, vegetarian: false, vegan: false },
  ],
  taza: [{ name: "Chicken Wrap", price: 8, vegetarian: false, vegan: false }],
};
