import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const DOMAIN = "sfsu.edu";
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
  provider.setCustomParameters({ hd: DOMAIN, prompt: "select_account" });
  const { user } = await signInWithPopup(auth, provider);
  if (!user.email?.toLowerCase().endsWith(`@${DOMAIN}`)) {
    await signOut(auth);
    throw new Error(`Please use your @${DOMAIN} account`);
  }
}

export const logOut = () => signOut(auth);
export const getToken = async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null);
