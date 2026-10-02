// PLACEHOLDER seed data (in-memory). Replace names/times with the real 3 buildings x 3 restaurants.
export const restaurants = [
  { id: "cafe1", name: "Campus Cafe", walkTimes: { HSS: 4, Thornton: 5, Library: 6 }, prepTime: 8, walkTimeToClass: 5 },
  { id: "cafe2", name: "Restaurant B (TBD)", walkTimes: { HSS: 6, Thornton: 4, Library: 3 }, prepTime: 6, walkTimeToClass: 4 },
  { id: "cafe3", name: "Restaurant C (TBD)", walkTimes: { HSS: 8, Thornton: 7, Library: 5 }, prepTime: 5, walkTimeToClass: 6 },
];

export const menuItems = {
  cafe1: [{ name: "Veggie Wrap", price: 9.5, vegetarian: true, vegan: false }],
  cafe2: [{ name: "Falafel Bowl", price: 10.5, vegetarian: true, vegan: true }],
  cafe3: [{ name: "Chicken Sandwich", price: 8, vegetarian: false, vegan: false }],
};
