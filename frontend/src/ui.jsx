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
