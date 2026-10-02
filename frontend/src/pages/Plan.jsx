import { field, Card, Field, DietChips, SignInGate } from "../ui.jsx";
import Schedule from "../Schedule.jsx";

// Plan your day: upload a class schedule, see the eating windows between classes.
export default function Plan({ meta, form, setForm, signedIn, uid }) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Plan your day</h1>
        <p className="mt-2 max-w-xl text-slate-600">Upload a photo of your class schedule. We find the gaps between classes and suggest where to eat in each one.</p>
      </div>

      {!signedIn ? (
        <SignInGate what="save a class schedule" />
      ) : (
        <>
          <Card title="Your preferences" subtitle="Used for the suggestions below. The same settings as on the home page.">
            <div className="space-y-4">
              <div className="max-w-[12rem]">
                <Field label="Budget ($)">
                  <input className={field} type="number" min="1" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </Field>
              </div>
              <DietChips diets={form.diets} onChange={(diets) => setForm({ ...form, diets })} />
            </div>
          </Card>
          <Schedule key={uid || "demo"} buildings={meta.buildings} diets={form.diets} budget={form.budget} />
        </>
      )}
    </>
  );
}
