import { useEffect, useState } from "react";
import { extract, save, addRestaurant } from "../api.js";
import { field, btnPrimary, btnGold, toBase64, Card, Field, fillWalks, AssumeField, SignInGate } from "../ui.jsx";

// Add a restaurant (with walking minutes from the campus buildings), then scan its menu.
export default function Restaurants({ meta, signedIn, onChanged, onSaved }) {
  const [newR, setNewR] = useState({ name: "", walks: {}, assume: "" });
  const [restaurantId, setRestaurantId] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // keep the selected restaurant valid as the list changes
  useEffect(() => {
    setRestaurantId((id) => (meta.restaurants.some((r) => r.id === id) ? id : meta.restaurants[0]?.id || ""));
  }, [meta.restaurants]);

  const submitRestaurant = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const created = await addRestaurant({ name: newR.name.trim(), walks: fillWalks(newR.walks, "building", meta.buildings, newR.assume) });
      await onChanged();
      setRestaurantId(created.id);
      setNewR({ name: "", walks: {}, assume: "" });
      setMsg(`Added ${created.name} (only you can see it). It's selected below. Scan its menu to add dishes.`);
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
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await save({ restaurantId, items: items.map((it) => ({ ...it, price: Number(it.price) })) });
      onSaved(items.map((it) => it.name));
      setMsg(`Saved ${items.length} item${items.length !== 1 ? "s" : ""} to your menus. Go to the home page and search to see them.`);
      await onChanged();
      setItems(null);
      setFile(null);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Add a restaurant</h1>
        <p className="mt-2 max-w-xl text-slate-600">Add a place to eat and how far it is from campus buildings, then scan its menu. Only you can see what you add.</p>
      </div>

      {!signedIn ? (
        <SignInGate what="add restaurants and menus" />
      ) : (
        <>
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          {msg && <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm font-medium text-ink-900">{msg}</p>}

          <Card title="1. Add the restaurant" subtitle="Enter the walking minutes from the buildings you know, or one number to use for all of them.">
            <form onSubmit={submitRestaurant} className="space-y-4">
              <Field label="Name">
                <input className={field} placeholder="e.g. Campus Grill" value={newR.name} onChange={(e) => setNewR({ ...newR, name: e.target.value })} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                {meta.buildings.map((b) => (
                  <Field key={b} label={`From ${b}`}>
                    <input
                      className={field}
                      type="number"
                      min="1"
                      placeholder="minutes (optional)"
                      value={newR.walks[b] ?? ""}
                      onChange={(e) => setNewR({ ...newR, walks: { ...newR.walks, [b]: e.target.value } })}
                    />
                  </Field>
                ))}
              </div>
              <AssumeField value={newR.assume} onChange={(v) => setNewR({ ...newR, assume: v })} />
              <button className={btnPrimary}>Add restaurant</button>
            </form>
          </Card>

          <Card title="2. Scan its menu" subtitle="Pick a restaurant, upload a clear photo, and review what Gemini finds. Saved items are only visible to you.">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Restaurant">
                  <select className={field} value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                    {meta.restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}{r.mine ? " (yours)" : ""}</option>)}
                  </select>
                </Field>
                <Field label="Menu photo">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink-900 hover:file:bg-ink-100"
                  />
                </Field>
              </div>
              <button className={btnPrimary} disabled={!file || busy} onClick={scan}>
                {busy && !items ? "Reading menu…" : "Extract with Gemini"}
              </button>

              {items && (
                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    {source === "sample" ? "⚠️ Sample data (Gemini unavailable). " : `Gemini found ${items.length} item${items.length !== 1 ? "s" : ""}. `}
                    Check names, prices and diet tags, then confirm.
                  </p>
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {items.map((it, i) => (
                      <div key={i} className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 sm:grid-cols-[1fr_5.5rem_auto_auto_auto]">
                        <input className={field} value={it.name} onChange={(e) => editItem(i, "name", e.target.value)} />
                        <input className={field} type="number" step="0.01" value={it.price} onChange={(e) => editItem(i, "price", e.target.value)} />
                        <button type="button" onClick={() => removeItem(i)} aria-label={`Remove ${it.name}`} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:order-last">✕</button>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input type="checkbox" checked={it.vegetarian} onChange={(e) => editItem(i, "vegetarian", e.target.checked)} /> Veg
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input type="checkbox" checked={it.vegan} onChange={(e) => editItem(i, "vegan", e.target.checked)} /> Vegan
                        </label>
                        <div className="col-span-full flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 pb-2 text-xs text-slate-500">
                          Contains:
                          {["pork", "beef", "alcohol", "gluten", "nuts"].map((k) => (
                            <label key={k} className="flex items-center gap-1.5 capitalize">
                              <input type="checkbox" checked={Boolean(it[k])} onChange={(e) => editItem(i, k, e.target.checked)} /> {k}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className={btnGold} disabled={busy || !items.length} onClick={confirm}>Confirm &amp; add to my menu</button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
