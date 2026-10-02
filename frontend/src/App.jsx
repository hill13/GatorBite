import { useEffect, useState } from "react";
import { getMeta, recommend, extract, save, addRestaurant, addBuilding } from "./api.js";
import { watchUser, sendLink, completeEmailLink, signInWithGoogle, logOut, authDisabled, authConfigured } from "./auth.js";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";
const btnGold =
  "inline-flex items-center justify-center rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-semibold text-brand-900 shadow-sm transition hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50";

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const Card = ({ title, subtitle, id, children }) => (
  <section id={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    {title && <h2 className="text-lg font-semibold text-brand-900">{title}</h2>}
    {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    <div className={title ? "mt-4" : ""}>{children}</div>
  </section>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    {children}
  </label>
);

// walks: { [placeName]: minutes as typed } -> [{ [key]: placeName, minutes }] for the filled boxes only
const toWalks = (walks, key) =>
  Object.entries(walks)
    .filter(([, m]) => m !== "" && m != null)
    .map(([place, m]) => ({ [key]: place, minutes: Number(m) }));

export default function App() {
  const [meta, setMeta] = useState({ buildings: [], restaurants: [], shared: [], signedIn: false });
  const [form, setForm] = useState({ building: "", destination: "", diet: "vegetarian", budget: 12, minutesUntilClass: 25 });
  const [excluded, setExcluded] = useState([]);
  const [results, setResults] = useState(null);
  const [newNames, setNewNames] = useState([]);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const signedIn = authDisabled || Boolean(user);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  const [newR, setNewR] = useState({ name: "", walks: {} });
  const [newB, setNewB] = useState({ name: "", walks: {} });
  const [restaurantId, setRestaurantId] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    completeEmailLink().catch((err) => setError(err.message));
    return watchUser(setUser);
  }, []);

  const loadMeta = () =>
    getMeta()
      .then((m) => {
        setMeta(m);
        setForm((f) => ({
          ...f,
          building: m.buildings.includes(f.building) ? f.building : m.buildings[0],
          destination: m.buildings.includes(f.destination) ? f.destination : m.buildings[0],
        }));
        setRestaurantId((id) => (m.restaurants.some((r) => r.id === id) ? id : m.restaurants[0]?.id));
        return m;
      })
      .catch(() => setError("Can't reach the backend. Is it running?"));

  // reload what this visitor can see whenever they sign in or out
  useEffect(() => {
    loadMeta();
    setResults(null);
    setExcluded([]);
  }, [user]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleRestaurant = (id) => setExcluded(excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id]);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await sendLink(email.trim());
      setLinkSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") setError(err.message);
    }
  };

  const search = async (e) => {
    e?.preventDefault();
    setError("");
    try {
      setResults(
        await recommend({
          ...form,
          restaurantIds: meta.restaurants.map((r) => r.id).filter((id) => !excluded.includes(id)),
          budget: Number(form.budget),
          minutesUntilClass: Number(form.minutesUntilClass),
        })
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRestaurant = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const created = await addRestaurant({ name: newR.name.trim(), walks: toWalks(newR.walks, "building") });
      await loadMeta();
      setRestaurantId(created.id);
      setNewR({ name: "", walks: {} });
      setMsg(`Added ${created.name} (only you can see it). Select it under "Scan a menu" to add its items.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitBuilding = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const created = await addBuilding({ name: newB.name.trim(), walks: toWalks(newB.walks, "restaurantId") });
      await loadMeta();
      setNewB({ name: "", walks: {} });
      setMsg(`Added ${created.name} (only you can see it). You can now pick it in the search above.`);
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
      setNewNames(items.map((it) => it.name));
      setMsg(`Saved ${items.length} item${items.length !== 1 ? "s" : ""} to your menus. Search again to see them.`);
      await loadMeta();
      setItems(null);
      setFile(null);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400 text-lg font-extrabold text-brand-900">G</div>
            <div>
              <div className="text-lg font-bold leading-tight tracking-tight">GatorBite</div>
              <div className="text-xs text-brand-100">Eat well. Make it to class.</div>
            </div>
          </div>
          {!authDisabled &&
            (user ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-brand-100 sm:inline">{user.email}</span>
                <button onClick={logOut} className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">Sign out</button>
              </div>
            ) : (
              <a href="#account" className="rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-900 shadow-sm hover:bg-brand-50">Sign in</a>
            ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">What can I eat before class?</h1>
          <p className="mt-2 max-w-xl text-slate-600">
            Tell us where you are, where you're headed and how long you have. We rank food by total time: walk there, prep, and the walk to class.
          </p>
        </div>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <Card>
          <form onSubmit={search} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="I'm at">
                <select className={field} value={form.building} onChange={set("building")}>
                  {meta.buildings.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="My next class is at">
                <select className={field} value={form.destination} onChange={set("destination")}>
                  {meta.buildings.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Diet">
                <select className={field} value={form.diet} onChange={set("diet")}>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="any">Anything</option>
                </select>
              </Field>
              <Field label="Budget ($)">
                <input className={field} type="number" min="1" value={form.budget} onChange={set("budget")} />
              </Field>
              <Field label="Minutes until class">
                <input className={field} type="number" min="1" value={form.minutesUntilClass} onChange={set("minutesUntilClass")} />
              </Field>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Restaurants</span>
              <div className="flex flex-wrap gap-2">
                {meta.restaurants.map((r) => {
                  const on = !excluded.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggleRestaurant(r.id)}
                      aria-pressed={on}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                        on ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300 bg-white text-slate-500 line-through hover:border-slate-400"
                      }`}
                    >
                      {r.name}
                      {r.mine && <span className="ml-1.5 text-[10px] font-bold uppercase text-gold-400">yours</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className={btnGold} disabled={excluded.length === meta.restaurants.length}>Find food</button>
          </form>
        </Card>

        {results && (
          <Card
            title={`${results.length} option${results.length !== 1 ? "s" : ""} that fit`}
            subtitle={results.length ? "Fastest first. Time is walk there + prep + walk to class." : undefined}
          >
            {results.length === 0 ? (
              <p className="text-slate-500">Nothing fits. Try more time, a higher budget, or turn a restaurant back on.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{r.name}</span>
                        {newNames.includes(r.name) && r.source === "gemini-scan" && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-900 ring-1 ring-gold-400">New</span>
                        )}
                        {r.vegan && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Vegan</span>}
                      </div>
                      <div className="text-sm text-slate-500">{r.restaurant} · ${r.price.toFixed(2)}</div>
                    </div>
                    <div className="shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-center">
                      <div className="text-lg font-bold leading-none text-brand-900">{r.totalMinutes}</div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-brand-600">min</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <div className="pt-2">
          <h2 className="text-xl font-bold text-brand-900">Make it yours</h2>
          <p className="text-sm text-slate-500">Add your own buildings, restaurants and menus. Only you can see what you add.</p>
        </div>

        {msg && <p className="text-sm font-medium text-emerald-700">{msg}</p>}

        {!signedIn ? (
          <Card id="account" title="Sign in to add your own places" subtitle="Everyone shares the places below. Anything you add is only visible to you.">
            <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
              These {meta.shared.length} places are already here for everyone: <strong>{meta.shared.join(", ")}</strong>. To add more, sign in. New places are saved for your account only.
            </p>
            {!authConfigured ? (
              <p className="text-sm text-slate-500">Login isn't configured on this build yet.</p>
            ) : linkSent ? (
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Check your inbox. We sent a sign-in link to <strong>{email}</strong>. Open it on this device. If you don't see it, check your spam folder.
              </p>
            ) : (
              <form onSubmit={handleSendLink} className="flex flex-col gap-3 sm:flex-row">
                <input className={field} type="email" required placeholder="you@sfsu.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className={btnPrimary}>Email me a sign-in link</button>
              </form>
            )}
            {authConfigured && !linkSent && (
              <button onClick={handleGoogle} className="mt-3 text-xs font-medium text-brand-600 underline hover:text-brand-900">
                Approved Google account? Continue with Google
              </button>
            )}
          </Card>
        ) : (
          <>
            <Card title="Add a restaurant" subtitle="Enter the walking minutes from the buildings you know. You only need one.">
              <form onSubmit={submitRestaurant} className="space-y-4">
                <Field label="Name">
                  <input className={field} placeholder="e.g. Campus Grill" value={newR.name} onChange={(e) => setNewR({ ...newR, name: e.target.value })} required />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  {meta.buildings.map((b) => (
                    <Field key={b} label={`From ${b}`}>
                      <input className={field} type="number" min="1" placeholder="minutes (optional)" value={newR.walks[b] ?? ""} onChange={(e) => setNewR({ ...newR, walks: { ...newR.walks, [b]: e.target.value } })} />
                    </Field>
                  ))}
                </div>
                <button className={btnPrimary}>Add restaurant</button>
              </form>
            </Card>

            <Card title="Add a building or class location" subtitle="Enter the walking minutes to the restaurants you know. You only need one.">
              <form onSubmit={submitBuilding} className="space-y-4">
                <Field label="Name">
                  <input className={field} placeholder="e.g. Science Building" value={newB.name} onChange={(e) => setNewB({ ...newB, name: e.target.value })} required />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  {meta.restaurants.map((r) => (
                    <Field key={r.id} label={`To ${r.name}`}>
                      <input className={field} type="number" min="1" placeholder="minutes (optional)" value={newB.walks[r.id] ?? ""} onChange={(e) => setNewB({ ...newB, walks: { ...newB.walks, [r.id]: e.target.value } })} />
                    </Field>
                  ))}
                </div>
                <button className={btnPrimary}>Add building</button>
              </form>
            </Card>

            <Card title="Scan a menu" subtitle="Pick a restaurant, upload a clear photo, and review what Gemini finds. Saved items are only visible to you.">
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
                      className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-900 hover:file:bg-brand-100"
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
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-xs text-slate-400 sm:px-6">
        Built at SF Hacks x GDG. Menus are read by Gemini and stored in Firestore.
      </footer>
    </div>
  );
}
