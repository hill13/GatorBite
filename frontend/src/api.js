const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const post = async (path, body) => {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
};

export const getMeta = () => fetch(API + "/api/meta").then((r) => r.json());
export const recommend = (q) => post("/api/recommendations", q);
export const extract = (b) => post("/api/menus/extract", b);
export const save = (b) => post("/api/menus/save", b);
export const addRestaurant = (b) => post("/api/restaurants", b);
