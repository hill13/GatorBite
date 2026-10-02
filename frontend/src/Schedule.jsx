import { useEffect, useState } from "react";
import { extractSchedule, getSchedule, saveSchedule, suggestSchedule } from "./api.js";
import { field, btnPrimary, btnGold, toBase64, Card, Field } from "./ui.jsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "13:45" -> "1:45 PM"
const clock = (t) => {
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? "AM" : "PM"}`;
};

const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

export default function Schedule({ buildings, diets, budget }) {
  const [saved, setSaved] = useState([]);
  const [plan, setPlan] = useState(null);
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const loadPlan = async () => {
    try {
      setPlan(await suggestSchedule({ diets, budget: Number(budget) }));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    getSchedule()
      .then((s) => {
        setSaved(s.classes);
        if (s.classes.length) loadPlan();
      })
      .catch((err) => setError(err.message));
  }, []);

  // refresh suggestions when the diet or budget above changes
  useEffect(() => {
    if (saved.length) loadPlan();
  }, [diets.join(","), budget]);

  const scan = async () => {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const out = await extractSchedule({ imageBase64: await toBase64(file), mimeType: file.type });
      setDraft(out.classes);
      setSource(out.source);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const edit = (i, k, v) => setDraft(draft.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const unmapped = draft ? draft.filter((c) => !c.building).length : 0;

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const out = await saveSchedule({ classes: draft.filter((c) => c.building) });
      setSaved(out.classes);
      setDraft(null);
      setFile(null);
      setMsg(`Saved ${out.saved} class${out.saved !== 1 ? "es" : ""}.`);
      await loadPlan();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <Card
      title="Plan my day"
      subtitle="Upload a photo of your class schedule. We find the gaps between classes and suggest where to eat, using your places, diet and budget above."
    >
      <div className="space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label={saved.length ? "Replace schedule with a new photo" : "Schedule photo"}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink-900 hover:file:bg-ink-100"
            />
          </Field>
          <button className={btnPrimary} disabled={!file || busy} onClick={scan}>
            {busy && !draft ? "Reading schedule…" : "Read my schedule"}
          </button>
        </div>

        {draft && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              {source === "sample" ? "⚠️ Sample data (Gemini unavailable). " : `Gemini found ${draft.length} class meeting${draft.length !== 1 ? "s" : ""}. `}
              Check the times and pick the building for each class.
              {unmapped > 0 && <strong className="text-ink-900"> {unmapped} still need a building and will be skipped.</strong>}
            </p>
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {draft.map((c, i) => (
                <div key={i} className="grid grid-cols-2 items-center gap-2 border-b border-slate-200 pb-3 sm:grid-cols-[1fr_5rem_6.5rem_6.5rem_1fr_auto]">
                  <div className="col-span-2 sm:col-span-1">
                    <input className={field} value={c.course} onChange={(e) => edit(i, "course", e.target.value)} aria-label="Course" />
                    {c.location && <div className="mt-0.5 text-[11px] text-slate-400">Printed as: {c.location}</div>}
                  </div>
                  <select className={field} value={c.day} onChange={(e) => edit(i, "day", e.target.value)} aria-label="Day">
                    {DAYS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  <input className={field} type="time" value={c.start} onChange={(e) => edit(i, "start", e.target.value)} aria-label="Start" />
                  <input className={field} type="time" value={c.end} onChange={(e) => edit(i, "end", e.target.value)} aria-label="End" />
                  <select
                    className={`${field} ${c.building ? "" : "border-accent-500 bg-accent-100"}`}
                    value={c.building || ""}
                    onChange={(e) => edit(i, "building", e.target.value || null)}
                    aria-label="Building"
                  >
                    <option value="">Pick building…</option>
                    {buildings.map((b) => <option key={b}>{b}</option>)}
                  </select>
                  <button type="button" onClick={() => setDraft(draft.filter((_, idx) => idx !== i))} aria-label={`Remove ${c.course}`} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
            <button className={btnGold} disabled={busy || unmapped === draft.length} onClick={confirm}>Save schedule</button>
          </div>
        )}

        {msg && <p className="text-sm font-medium text-ink-700">{msg}</p>}

        {plan && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-ink-900">Your eating windows</h3>
              <p className="text-xs text-slate-500">
                A place counts only if the walk, prep and walk to your next class leave at least {plan.eatMinutes} minutes to eat. Best 3 places per gap.
              </p>
            </div>
            {plan.days.map((d) => (
              <div key={d.day}>
                <div className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-600">{d.day}</div>
                {d.gaps.length === 0 && (
                  <p className="text-sm text-slate-500">{d.classCount === 1 ? "Only one class, so no gap between classes." : "Classes are back to back."}</p>
                )}
                <div className="space-y-3">
                  {d.gaps.map((g, gi) => (
                    <div key={gi} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-semibold text-slate-900">
                          {clock(g.from)} – {clock(g.to)}
                          <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">{duration(g.minutes)} gap</span>
                        </div>
                        <div className="text-xs text-slate-500">{g.after} ({g.fromBuilding}) → {g.before} ({g.toBuilding})</div>
                      </div>
                      {g.options.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">No place fits this gap with your current diet and budget. Try loosening them above.</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-slate-100">
                          {g.options.map((o, oi) => (
                            <li key={oi} className="flex items-center justify-between gap-4 py-2.5">
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900">
                                  {oi === 0 && <span className="mr-2 rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-900 ring-1 ring-accent-400">Best</span>}
                                  {o.restaurant}
                                </div>
                                <div className="text-sm text-slate-500">{o.dishes.map((x) => `${x.name} $${x.price.toFixed(2)}`).join(" · ")}</div>
                              </div>
                              <div className="shrink-0 text-right text-xs text-slate-500">
                                <div className="text-sm font-semibold text-ink-900">{o.totalMinutes} min trip</div>
                                {o.spare} min to spare
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
