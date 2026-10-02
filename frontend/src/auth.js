import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

const DOMAIN = "sfsu.edu";
// Extra approved accounts besides @sfsu.edu (must match ALLOWED_EMAILS on the backend), comma-separated
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

export const isApproved = (email = "") => {
  const e = email.toLowerCase();
  return e.endsWith(`@${DOMAIN}`) || EXTRA.includes(e);
};

// Calls cb(user or null). A signed-in account that isn't approved is signed straight back out.
export const watchUser = (cb) =>
  auth
    ? onAuthStateChanged(auth, async (u) => {
        if (u && !isApproved(u.email)) {
          await signOut(auth);
          cb(null);
        } else cb(u);
      })
    : (cb(null), () => {});

// Email-link login: we email a sign-in link; clicking it proves the person owns that inbox.
export async function sendLink(email) {
  if (!isApproved(email)) throw new Error(`Use your @${DOMAIN} email address`);
  await sendSignInLinkToEmail(auth, email, { url: window.location.origin, handleCodeInApp: true });
  localStorage.setItem("gb_email", email);
}

// Run on page load: if the user arrived from the emailed link, finish signing in.
export async function completeEmailLink() {
  if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;
  const link = window.location.href;
  const email = localStorage.getItem("gb_email") || window.prompt("Confirm your email to finish signing in");
  window.history.replaceState({}, "", window.location.pathname); // hide the one-time code in the URL
  if (!email) return;
  await signInWithEmailLink(auth, email, link);
  localStorage.removeItem("gb_email");
}

// Approved Google accounts (for example the team's personal account) can sign in with a popup.
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
  if (!isApproved(user.email)) {
    await signOut(auth);
    throw new Error("This Google account is not on the approved list");
  }
}

export const logOut = () => signOut(auth);
export const getToken = async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null);
