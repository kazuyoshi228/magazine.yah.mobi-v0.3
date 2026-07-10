import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { verifyFirebaseToken } from "./firebase-admin";

export function registerOAuthRoutes(app: Express) {
  // ── Firebase Auth session endpoint ────────────────────────────────────────
  // Frontend sends the Firebase ID token; server verifies it, upserts the
  // user in DB, then sets an httpOnly session cookie containing the same
  // Firebase ID token (re-verified on each request via context.ts).
  app.post("/api/auth/firebase/session", async (req: Request, res: Response) => {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    try {
      const decoded = await verifyFirebaseToken(idToken);

      await db.upsertUserByFirebase({
        firebaseUid: decoded.uid,
        name: decoded.name ?? null,
        email: decoded.email ?? null,
        avatarUrl: decoded.picture ?? null,
      });

      const cookieOptions = getSessionCookieOptions(req);
      // Store the raw Firebase ID token as the session cookie.
      // context.ts will verify it on every request.
      res.cookie(COOKIE_NAME, idToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ ok: true });
    } catch (error) {
      console.error("[Firebase Auth] Session creation failed", error);
      res.status(401).json({ error: "Invalid Firebase ID token" });
    }
  });

  // ── Firebase Auth logout ──────────────────────────────────────────────────
  app.post("/api/auth/firebase/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions });
    res.json({ ok: true });
  });
}
