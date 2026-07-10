import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, signInWithGoogle, signOutFirebase, onAuthStateChanged } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  /** admin カスタムクレームで判定（scripts/set-admin.mjs で付与） */
  role: "admin" | "user";
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const token = await fbUser.getIdTokenResult();
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName,
          email: fbUser.email,
          avatarUrl: fbUser.photoURL,
          role: token.claims.admin === true ? "admin" : "user",
        });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = useCallback(async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutFirebase();
    setUser(null);
  }, []);

  const state = useMemo(
    () => ({
      user,
      loading: loading || signingIn,
      error: null as Error | null,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, signingIn],
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading || signingIn) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, signingIn, loading, state.user]);

  return {
    ...state,
    refresh: async () => auth.currentUser?.getIdToken(true),
    login,
    logout,
  };
}
