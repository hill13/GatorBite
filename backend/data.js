// Seed data (copied into Firestore by `npm run seed`). Walk times are real; prep time is a flat 5 min.
export const buildings = ["Thornton Hall", "SFSU Library", "Mashouff Wellness Center"];

export const restaurants = [
  { id: "cafe-rosso", name: "Cafe Rosso", walkTimes: { "Thornton Hall": 6, "SFSU Library": 6, "Mashouff Wellness Center": 5 }, prepTime: 5 },
  { id: "carmelinas", name: "Carmelina's Cafe", walkTimes: { "Thornton Hall": 5, "SFSU Library": 6, "Mashouff Wellness Center": 13 }, prepTime: 5 },
  { id: "taza", name: "Taza Smoothies and Wraps", walkTimes: { "Thornton Hall": 8, "SFSU Library": 8, "Mashouff Wellness Center": 5 }, prepTime: 5 },
];

// item(name, price, tags): tags is a space-separated list of what the dish IS or CONTAINS:
//   veg vegan | pork beef | gluten nuts
// These tags are best guesses from menu text, not certifications. Be conservative:
//   - pork: ham, bacon, salami, sausage (or a meat choice that may include them)
//   - gluten: bread, bagel, bun, tortilla, soy-sauce dishes, breaded items
//   - nuts: pesto (pine nuts), peanut sauce, granola, anything unclear
const item = (name, price, tags = "") => {
  const t = new Set(tags.split(" "));
  return {
    name,
    price,
    vegetarian: t.has("veg") || t.has("vegan"),
    vegan: t.has("vegan"),
    pork: t.has("pork"),
    beef: t.has("beef"),
    gluten: t.has("gluten"),
    nuts: t.has("nuts"),
  };
};

export const menuItems = {
  // Real Cafe Rosso menu (meals and a few sides; sandwiches at full size). Drinks, bagel build-yours and modifiers skipped.
  "cafe-rosso": [
    // breakfast sandwiches
    item("Ham or Turkey Croissant", 5.95, "pork gluten"),
    item("Bacon, Egg & Cheese Sandwich", 9.5, "pork gluten"),
    item("Southwestern Breakfast Sandwich", 8.25, "pork gluten"),
    item("Mediterranean Breakfast Sandwich", 8.25, "veg gluten nuts"),
    item("Bacon, Egg & Cheese Bagel", 7.95, "pork gluten"),
    // deli sandwiches
    item("Turkey Breast Sandwich", 9.95, "gluten"),
    item("Ham Sandwich", 9.95, "pork gluten"),
    item("Beef Pastrami Sandwich", 9.95, "beef gluten"),
    item("Salami Sandwich", 9.95, "pork gluten"),
    item("Tuna Salad Sandwich", 9.95, "gluten"),
    item("Chicken Salad Sandwich", 9.95, "gluten"),
    item("Hummus & Avocado Sandwich", 9.95, "veg gluten"),
    // vegetarian sandwiches
    item("Falafel Hummus Sandwich", 10.95, "veg gluten"),
    item("Vegan Portobello Sandwich", 10.5, "vegan gluten"),
    item("Deluxe Vegetarian Sandwich", 11.5, "veg gluten"),
    item("Basil Mozzarella Sandwich", 11.25, "veg gluten nuts"),
    item("Veggie Chicken Pesto Sandwich", 11.95, "veg gluten nuts"),
    item("Eggplant Parm Sandwich", 11.5, "veg gluten nuts"),
    // specialty sandwiches
    item("B.L.T.A Sandwich", 10.95, "pork gluten"),
    item("Chicken Pesto Avocado Sandwich", 11.95, "gluten nuts"),
    item("BBQ Chicken Sandwich", 10.95, "gluten"),
    item("Rosso Club", 11.75, "pork gluten"),
    item("Chicken Breast Sandwich", 10.95, "gluten"),
    item("Turkey, Bacon & Swiss Sandwich", 11.75, "pork gluten"),
    item("Chicken Chipotle Sandwich", 10.95, "gluten"),
    item("Tuna Melt", 10.5, "gluten"),
    item("Turkey, Salami, Bacon, Avocado Sandwich", 12.95, "pork gluten"),
    item("Hot Pastrami Reuben", 10.95, "beef gluten"),
    item("Grilled Three Cheese", 9.5, "veg gluten nuts"),
    // rice dishes (teriyaki sauce contains soy, so treated as gluten)
    item("Chicken Teriyaki Rice Bowl", 10.95, "gluten"),
    item("Veggie Chicken Teriyaki Rice Bowl", 10.95, "veg gluten"),
    item("Thai Peanut Chicken Rice Bowl", 11.5, "gluten nuts"),
    item("Basil Sweet Chili Chicken Rice Bowl", 10.95, "gluten"),
    // burgers and fries
    item("Cheeseburger", 8.95, "beef gluten"),
    item("Veggie Burger", 8.95, "veg gluten"),
    item("Crispy Chicken Burger", 8.95, "gluten"),
    item("Cheeseburger & Fries", 11.95, "beef gluten"),
    item("Chicken Tenders & Fries", 11.95, "gluten"),
    item("All-Beef Hot Dog", 5.95, "beef gluten"),
    // pasta and sides
    item("Mac 'n Cheese & Garlic Bread", 7.95, "veg gluten"),
    item("Side Salad", 4.95, "veg"),
    item("French Fries", 4.95, "vegan"),
    item("Potato Salad", 4.95, "veg"),
  ],
  // Real Carmelina's menu (individual items only; catering dozens and drinks skipped)
  carmelinas: [
    item("Hard Boiled Egg", 1.5, "veg"),
    item("Fruit Salad Cup", 5.25, "vegan"),
    item("Smoked Salmon Bagel", 6.5, "gluten"),
    item("Dr. Lindsay Bagel", 5.75, "pork gluten"),
    item("M.C.B Bagel", 5.75, "pork gluten"),
    item("B.L.T Bagel", 5.75, "pork gluten"),
  ],
  // Real Taza menu, read from two photos. The specialty quesadillas/nachos board is NOT seeded on purpose:
  // it is the live-scan demo photo. Taco Plate's meat is unknown, so it is flagged pork and beef.
  taza: [
    item("Breakfast Burrito", 6.5, "veg gluten"),
    item("The Southwest", 7.5, "veg gluten"),
    item("The Moroccan", 7.5, "veg gluten"),
    item("Acai Smoothie", 6.5, "vegan"),
    item("Acai Bowl", 7.5, "veg gluten nuts"),
    item("Cheese Quesadilla", 5.5, "veg gluten"),
    item("Veggie Quesadilla", 6.25, "veg gluten"),
    item("Chips & Salsa Fresca", 2.5, "vegan"),
    item("Taco Plate", 6.95, "pork beef gluten"),
  ],
};
