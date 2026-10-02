import { useEffect, useState } from "react";
import { getMeta, recommend, extract, save, addRestaurant } from "./api.js";

const input = "w-full rounded-lg border border-gray-300 px-3 py-2";
const btn = "rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50";

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function App() {
  const [meta, setMeta] = useState({ buildings: [], restaurants: [] });
  const [form, setForm] = useState({ building: "", destination: "", diet: "vegetarian", budget: 12, minutesUntilClass: 25 });
  const [excluded, setExcluded] = useState([]);
  const [newR, setNewR] = useState({ name: "", walk: {} });
  const [results, setResults] = useState(null);
  const [newNames, setNewNames] = useState([]);
  const [error, setError] = useState("");

  const [restaurantId, setRestaurantId] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getMeta()
      .then((m) => {
        setMeta(m);
        setForm((f) => ({ ...f, building: m.buildings[0], destination: m.buildings[0] }));
        setRestaurantId(m.restaurants[0]?.id);
      })
      .catch(() => setError("Can't reach the backend. Is it running on :8080?"));
  }, []);

  const submitRestaurant = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const created = await addRestaurant({ name: newR.name, walkTimes: newR.walk });
      setMeta(await getMeta());
      setRestaurantId(created.id);
      setNewR({ name: "", walk: {} });
      setMsg(`Added ${created.name}. Pick it under "Scan a menu" to add its items.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const search = async (e) => {
    e?.preventDefault();
    setError("");
    try {
      const out = await recommend({
        ...form,
        restaurantIds: meta.restaurants.map((r) => r.id).filter((id) => !excluded.includes(id)),
        budget: Number(form.budget),
        minutesUntilClass: Number(form.minutesUntilClass),
      });
      setResults(out);
    } catch (err) {
      setError(err.message);
    }
  };

  const scan = async () => {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const out = await extract({ restaurantId, imageBase64: await toBase64(file), mimeType: file.type });
      setItems(out.items);
      setSource(out.source);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const editItem = (i, k, v) => setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const confirm = async () => {
    setBusy(true);
    try {
      await save({ restaurantId, items: items.map((it) => ({ ...it, price: Number(it.price) })) });
      setNewNames(items.map((it) => it.name));
      setMsg(`Saved ${items.length} item(s). Search again to see them.`);
      setItems(null);
      setFile(null);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-bold text-emerald-700">🐊 GatorBite</h1>
          <p className="text-gray-600">What can I actually eat before my next class?</p>
        </header>

        {error && <div className="rounded-lg bg-red-100 p-3 text-red-800">{error}</div>}

        <form onSubmit={search} className="space-y-3 rounded-xl bg-white p-4 shadow">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">I'm at</span>
              <select className={input} value={form.building} onChange={set("building")}>
                {meta.buildings.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">My next class is at</span>
              <select className={input} value={form.destination} onChange={set("destination")}>
                {meta.buildings.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Diet</span>
              <select className={input} value={form.diet} onChange={set("diet")}>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="any">Any</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Budget ($)</span>
              <input className={input} type="number" min="1" value={form.budget} onChange={set("budget")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Minutes left</span>
              <input className={input} type="number" min="1" value={form.minutesUntilClass} onChange={set("minutesUntilClass")} />
            </label>
          </div>
          <div>
            <span className="text-sm font-medium">Include restaurants</span>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {meta.restaurants.map((r) => (
                <label key={r.id} className="text-sm">
                  <input
                    type="checkbox"
                    checked={!excluded.includes(r.id)}
                    onChange={() => setExcluded(excluded.includes(r.id) ? excluded.filter((x) => x !== r.id) : [...excluded, r.id])}
                  />{" "}
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <button className={btn} disabled={excluded.length === meta.restaurants.length}>Find food</button>
        </form>

        {results && (
          <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-2 text-xl font-semibold">{results.length} option{results.length !== 1 && "s"}</h2>
            {results.length === 0 && <p className="text-gray-500">Nothing fits. Try more time or budget.</p>}
            <ul className="divide-y">
              {results.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">
                      {r.name}
                      {newNames.includes(r.name) && r.source === "gemini-scan" && (
                        <span className="ml-2 rounded bg-amber-200 px-2 py-0.5 text-xs font-bold">NEW</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{r.restaurant} · ${r.price.toFixed(2)}</div>
                  </div>
                  <div className="text-right font-semibold text-emerald-700">{r.totalMinutes} min</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={submitRestaurant} className="space-y-3 rounded-xl bg-white p-4 shadow">
          <h2 className="text-xl font-semibold">Add a restaurant</h2>
          <input className={input} placeholder="Restaurant name" value={newR.name} onChange={(e) => setNewR({ ...newR, name: e.target.value })} required />
          <div className="grid grid-cols-3 gap-3">
            {meta.buildings.map((b) => (
              <label key={b} className="block text-sm">
                Walk from {b} (min)
                <input
                  className={input}
                  type="number"
                  min="1"
                  required
                  value={newR.walk[b] || ""}
                  onChange={(e) => setNewR({ ...newR, walk: { ...newR.walk, [b]: e.target.value } })}
                />
              </label>
            ))}
          </div>
          <button className={btn}>Add restaurant</button>
        </form>

        <section className="space-y-3 rounded-xl bg-white p-4 shadow">
          <h2 className="text-xl font-semibold">Scan a menu</h2>
          <select className={input} value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
            {meta.restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <button className={btn} disabled={!file || busy} onClick={scan}>
            {busy && !items ? "Reading menu…" : "Extract with Gemini"}
          </button>

          {items && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {source === "sample" ? "⚠️ Sample data (Gemini unavailable). " : "Extracted by Gemini. "}Check these, edit if needed, then confirm.
              </p>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_auto_auto] items-center gap-2">
                  <input className={input} value={it.name} onChange={(e) => editItem(i, "name", e.target.value)} />
                  <input className={input} type="number" step="0.01" value={it.price} onChange={(e) => editItem(i, "price", e.target.value)} />
                  <label className="text-sm"><input type="checkbox" checked={it.vegetarian} onChange={(e) => editItem(i, "vegetarian", e.target.checked)} /> veg</label>
                  <label className="text-sm"><input type="checkbox" checked={it.vegan} onChange={(e) => editItem(i, "vegan", e.target.checked)} /> vegan</label>
                </div>
              ))}
              <button className={btn} disabled={busy} onClick={confirm}>Confirm &amp; Add</button>
            </div>
          )}
          {msg && <p className="text-emerald-700">{msg}</p>}
        </section>
      </div>
    </div>
  );
}
