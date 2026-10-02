import { getToken } from "./auth.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const send = async (method, path, body) => {
  const token = await getToken();
  const res = await fetch(API + path, {
    method,
    headers: { ...(body && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
};

export const getMeta = () => send("GET", "/api/meta");
export const recommend = (q) => send("POST", "/api/recommendations", q);
export const extract = (b) => send("POST", "/api/menus/extract", b);
export const save = (b) => send("POST", "/api/menus/save", b);
export const addRestaurant = (b) => send("POST", "/api/restaurants", b);
export const addBuilding = (b) => send("POST", "/api/buildings", b);
