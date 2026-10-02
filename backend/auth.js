import { getAuth } from "firebase-admin/auth";
import { usingFirestore } from "./db.js";

const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "sfsu.edu";
// Extra individual accounts allowed besides the domain, e.g. ALLOWED_EMAILS=me@gmail.com
const EXTRA = (process.env.ALLOWED_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// Demo-day escape hatch: AUTH_DISABLED=true skips login; everyone acts as one "demo" user.
const disabled = () => process.env.AUTH_DISABLED === "true";
const DEMO_USER = { uid: "demo", email: "demo@local" };

const allowed = (u) => {
  const email = (u.email || "").toLowerCase();
  return u.email_verified && (email.endsWith(`@${DOMAIN}`) || EXTRA.includes(email));
};

async function verify(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token || !usingFirestore) return null;
  try {
    const u = await getAuth().verifyIdToken(token);
    return allowed(u) ? u : null;
  } catch {
    return null;
  }
}

// Search and /api/meta: signed-in users also see their own places; everyone else sees the shared ones.
export async function optionalUser(req, _res, next) {
  req.user = disabled() ? DEMO_USER : await verify(req);
  next();
}

// Write endpoints: need a verified @sfsu.edu (or approved) account.
export async function requireUser(req, res, next) {
  if (disabled()) {
    req.user = DEMO_USER;
    return next();
  }
  if (!usingFirestore) return res.status(500).json({ error: "Auth not configured on the server" });
  if (!(req.headers.authorization || "").startsWith("Bearer ")) return res.status(401).json({ error: "Please sign in first" });
  const user = await verify(req);
  if (!user) return res.status(403).json({ error: "Sign in with a verified @sfsu.edu email" });
  req.user = user;
  next();
}
