import { field, btnPrimary, btnGold, Card, Field, DietChips } from "../ui.jsx";
import { authConfigured } from "../auth.js";

// Home: sign in, then "I'm at" / "My next class is at" and the food search.
export default function Home({ meta, form, setForm, excluded, setExcluded, results, newNames, onSearch, signedIn, login }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleRestaurant = (id) => setExcluded(excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id]);

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">What can I eat before class?</h1>
        <p className="mt-2 max-w-xl text-slate-600">
          Tell us where you are, where you're headed and how long you have. We rank food by total time: walk there, prep, and the walk to class.
        </p>
      </div>

      {!signedIn && (
        <Card id="account" title="Sign in" subtitle="Sign in to plan your day around your class schedule and add your own restaurants. Searching works without an account.">
          <p className="mb-4 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-900">
            These {meta.shared.length} places are already here for everyone: <strong>{meta.shared.join(", ")}</strong>. Anything you add is saved for your account only.
          </p>
          {!authConfigured ? (
            <p className="text-sm text-slate-500">Login isn't configured on this build yet.</p>
          ) : login.linkSent ? (
            <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-900">
              Check your inbox. We sent a sign-in link to <strong>{login.email}</strong>. Open it on this device. If you don't see it, check your spam folder.
            </p>
          ) : (
            <form onSubmit={login.onSendLink} className="flex flex-col gap-3 sm:flex-row">
              <input className={field} type="email" required placeholder="you@sfsu.edu" value={login.email} onChange={(e) => login.setEmail(e.target.value)} />
              <button className={btnPrimary}>Email me a sign-in link</button>
            </form>
          )}
          {authConfigured && !login.linkSent && (
            <button onClick={login.onGoogle} className="mt-3 text-xs font-medium text-ink-600 underline hover:text-ink-900">
              Approved Google account? Continue with Google
            </button>
          )}
        </Card>
      )}

      <Card>
        <form onSubmit={onSearch} className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget ($)">
              <input className={field} type="number" min="1" value={form.budget} onChange={set("budget")} />
            </Field>
            <Field label="Minutes until class">
              <input className={field} type="number" min="1" value={form.minutesUntilClass} onChange={set("minutesUntilClass")} />
            </Field>
          </div>
          <DietChips diets={form.diets} onChange={(diets) => setForm({ ...form, diets })} />
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
                      on ? "border-ink-900 bg-ink-900 text-white" : "border-slate-300 bg-white text-slate-500 line-through hover:border-slate-400"
                    }`}
                  >
                    {r.name}
                    {r.mine && <span className="ml-1.5 text-[10px] font-bold uppercase text-accent-400">yours</span>}
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
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-900 ring-1 ring-accent-400">New</span>
                      )}
                      {r.vegan && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">Vegan</span>}
                    </div>
                    <div className="text-sm text-slate-500">{r.restaurant} · ${r.price.toFixed(2)}</div>
                  </div>
                  <div className="shrink-0 rounded-lg bg-ink-50 px-3 py-1.5 text-center">
                    <div className="text-lg font-bold leading-none text-ink-900">{r.totalMinutes}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-600">min</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
