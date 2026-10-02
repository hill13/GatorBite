export const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ink-600 focus:ring-2 focus:ring-ink-100";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGold =
  "inline-flex items-center justify-center rounded-lg bg-accent-400 px-5 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50";

export const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export const Card = ({ title, subtitle, id, children }) => (
  <section id={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    {title && <h2 className="text-lg font-semibold text-ink-900">{title}</h2>}
    {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    <div className={title ? "mt-4" : ""}>{children}</div>
  </section>
);

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    {children}
  </label>
);


// Walking minutes for every place: the typed value, else the "assume this many for the rest" value.
export const fillWalks = (walks, key, all, assume) =>
  all
    .map((p) => ({ [key]: p, minutes: Number(walks[p] !== undefined && walks[p] !== "" ? walks[p] : assume) }))
    .filter((w) => w.minutes > 0);

export const AssumeField = ({ value, onChange }) => (
  <Field label="Not sure about the rest? Assume this many minutes">
    <input className={field} type="number" min="1" placeholder="e.g. 7 (optional)" value={value} onChange={(e) => onChange(e.target.value)} />
  </Field>
);

export const DIETS = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["halal", "Halal-friendly"],
  ["no-pork", "No pork"],
  ["no-beef", "No beef"],
  ["gluten-free", "Gluten-free"],
  ["nut-free", "Nut-free"],
];

// Combinable diet chips. diets: string[]; onChange(newList)
export const DietChips = ({ diets, onChange }) => (
  <div>
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Diet (pick any)</span>
    <div className="flex flex-wrap gap-2">
      {DIETS.map(([value, label]) => {
        const on = diets.includes(value);
        return (
          <button
            type="button"
            key={value}
            onClick={() => onChange(on ? diets.filter((d) => d !== value) : [...diets, value])}
            aria-pressed={on}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              on ? "border-accent-500 bg-accent-100 text-ink-900" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
    {diets.some((d) => ["halal", "gluten-free", "nut-free"].includes(d)) && (
      <p className="mt-2 text-xs text-slate-500">
        Halal, gluten-free and nut-free are best guesses from menu text. Menus don't show certification or cross-contact, so check with the restaurant, especially for allergies.
      </p>
    )}
  </div>
);

// Shown on pages that need an account
export const SignInGate = ({ what }) => (
  <Card title="Sign in first" subtitle={`You need an account to ${what}.`}>
    <a href="#/" className="inline-flex rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-700">Go to the home page to sign in</a>
  </Card>
);
