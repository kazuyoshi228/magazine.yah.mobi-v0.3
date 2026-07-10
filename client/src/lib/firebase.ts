import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Prevent duplicate initialization during HMR
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

/**
 * Exchange a Firebase ID token for a server session cookie.
 * Called on initial login and whenever the token is refreshed.
 */
async function exchangeIdTokenForSession(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/firebase/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to create server session");
  }
}

/**
 * Sign in with Google popup and create a server session cookie.
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  await exchangeIdTokenForSession(idToken);
  return result.user;
}

/**
 * Start listening for Firebase ID token changes and automatically
 * refresh the server session cookie when the token is renewed.
 *
 * Firebase ID tokens expire after 1 hour. The Firebase SDK silently
 * refreshes them; this listener propagates the new token to the server
 * so the httpOnly session cookie stays valid.
 *
 * Returns an unsubscribe function.
 */
export function startTokenAutoRefresh(): () => void {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) return; // Not signed in — no refresh needed
    try {
      const idToken = await user.getIdToken();
      await exchangeIdTokenForSession(idToken);
    } catch (err) {
      // Non-fatal: the user will be asked to re-login on the next 401
      console.warn("[Firebase] Token auto-refresh failed:", err);
    }
  });
}

/**
 * Sign out from Firebase and clear the server session cookie.
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
  await fetch("/api/auth/firebase/logout", {
    method: "POST",
    credentials: "include",
  });
}

export { onAuthStateChanged, onIdTokenChanged, type FirebaseUser };
