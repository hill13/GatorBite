import { getAuth } from "firebase-admin/auth";
import { usingFirestore } from "./db.js";

const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "sfsu.edu";

// Protects write endpoints: needs a Firebase ID token from a verified @sfsu.edu account.
// Demo-day escape hatch: set AUTH_DISABLED=true in backend/.env to turn the check off.
export async function requireSfsu(req, res, next) {
  if (process.env.AUTH_DISABLED === "true") return next();
  if (!usingFirestore) return res.status(500).json({ error: "Auth not configured on the server" });
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ error: "Please sign in with your SFSU Google account" });
  try {
    const user = await getAuth().verifyIdToken(token);
    if (!user.email_verified || !user.email?.toLowerCase().endsWith(`@${DOMAIN}`)) {
      return res.status(403).json({ error: `Only @${DOMAIN} accounts can do this` });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Sign-in expired. Please sign in again." });
  }
}
