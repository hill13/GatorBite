import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const DOMAIN = "sfsu.edu";
// Extra allowed accounts (must match ALLOWED_EMAILS on the backend), comma-separated
const EXTRA = (import.meta.env.VITE_ALLOWED_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
// Demo-day escape hatch: VITE_AUTH_DISABLED=true skips login in the UI (also set AUTH_DISABLED=true on the backend).
export const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";

const env = import.meta.env;
export const authConfigured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID);

let auth = null;
if (authConfigured && !authDisabled) {
  auth = getAuth(
    initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  );
}

export const watchUser = (cb) => (auth ? onAuthStateChanged(auth, cb) : (cb(null), () => {}));

export async function signIn() {
  const provider = new GoogleAuthProvider();
  // the hd hint hides non-SFSU accounts, so only use it when no extra accounts are allowed
  provider.setCustomParameters(EXTRA.length ? { prompt: "select_account" } : { hd: DOMAIN, prompt: "select_account" });
  const { user } = await signInWithPopup(auth, provider);
  const email = (user.email || "").toLowerCase();
  if (!(email.endsWith(`@${DOMAIN}`) || EXTRA.includes(email))) {
    await signOut(auth);
    throw new Error(`Please use your @${DOMAIN} account`);
  }
}

export const logOut = () => signOut(auth);
export const getToken = async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null);
