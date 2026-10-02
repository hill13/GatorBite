import { useEffect, useState } from "react";
import { getMeta, recommend } from "./api.js";
import { watchUser, sendLink, completeEmailLink, signInWithGoogle, logOut, authDisabled } from "./auth.js";
import Home from "./pages/Home.jsx";
import Plan from "./pages/Plan.jsx";
import Restaurants from "./pages/Restaurants.jsx";

// Pages use #/ addresses, so a static host needs no extra routing setup.
const PAGES = [
  ["#/", "Home"],
  ["#/plan", "Plan your day"],
  ["#/restaurants", "Add a restaurant"],
];
const currentHash = () => (typeof window === "undefined" ? "#/" : window.location.hash || "#/");

export default function App() {
  const [route, setRoute] = useState(currentHash());
  const [meta, setMeta] = useState({ buildings: [], restaurants: [], shared: [], signedIn: false });
  const [form, setForm] = useState({ building: "", destination: "", diets: ["vegetarian"], budget: 12, minutesUntilClass: 25 });
  const [excluded, setExcluded] = useState([]);
  const [results, setResults] = useState(null);
  const [newNames, setNewNames] = useState([]);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const signedIn = authDisabled || Boolean(user);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setRoute(currentHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
        return m;
      })
      .catch(() => setError("Can't reach the backend. Is it running?"));

  // reload what this visitor can see whenever they sign in or out
  useEffect(() => {
    loadMeta();
    setResults(null);
    setExcluded([]);
  }, [user]);

  const login = {
    email,
    setEmail,
    linkSent,
    onSendLink: async (e) => {
      e.preventDefault();
      setError("");
      try {
        await sendLink(email.trim());
        setLinkSent(true);
      } catch (err) {
        setError(err.message);
      }
    },
    onGoogle: async () => {
      setError("");
      try {
        await signInWithGoogle();
      } catch (err) {
        if (err.code !== "auth/popup-closed-by-user") setError(err.message);
      }
    },
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

  const page = route.startsWith("#/plan") ? "#/plan" : route.startsWith("#/restaurants") ? "#/restaurants" : "#/";

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-ink-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400 text-lg font-extrabold text-ink-900">G</div>
            <div>
              <div className="text-lg font-bold leading-tight tracking-tight">GatorBite</div>
              <div className="text-xs text-ink-100">Eat well. Make it to class.</div>
            </div>
          </a>
          {!authDisabled && user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-ink-100 sm:inline">{user.email}</span>
              <button onClick={logOut} className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">Sign out</button>
            </div>
          )}
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 sm:px-6" aria-label="Pages">
          {PAGES.map(([href, label]) => (
            <a
              key={href}
              href={href}
              aria-current={page === href ? "page" : undefined}
              className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                page === href ? "border-accent-400 text-white" : "border-transparent text-ink-100 hover:text-white"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        {page === "#/" && (
          <Home
            meta={meta}
            form={form}
            setForm={setForm}
            excluded={excluded}
            setExcluded={setExcluded}
            results={results}
            newNames={newNames}
            onSearch={search}
            signedIn={signedIn}
            login={login}
          />
        )}
        {page === "#/plan" && <Plan meta={meta} form={form} setForm={setForm} signedIn={signedIn} uid={user?.uid} />}
        {page === "#/restaurants" && <Restaurants meta={meta} signedIn={signedIn} onChanged={loadMeta} onSaved={setNewNames} />}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-xs text-slate-400 sm:px-6">
        Built at SF Hacks x GDG. Menus are read by Gemini and stored in Firestore.
      </footer>
    </div>
  );
}
