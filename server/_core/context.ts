import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyFirebaseToken } from "./firebase-admin";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Extract the raw token from the request.
 * Checks cookie first, then Authorization header (Bearer).
 */
function extractToken(req: CreateExpressContextOptions["req"]): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    if (sessionCookie) return sessionCookie;
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Try to authenticate via Firebase ID token.
 * Returns the User record if successful, null otherwise.
 */
async function authenticateFirebase(token: string): Promise<User | null> {
  try {
    const decoded = await verifyFirebaseToken(token);
    const firebaseUid = decoded.uid;

    // Upsert user in our DB
    await db.upsertUserByFirebase({
      firebaseUid,
      name: decoded.name ?? null,
      email: decoded.email ?? null,
      avatarUrl: decoded.picture ?? null,
    });

    const user = await db.getUserByFirebaseUid(firebaseUid);
    return user ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const token = extractToken(opts.req);

  if (token) {
    user = await authenticateFirebase(token);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
