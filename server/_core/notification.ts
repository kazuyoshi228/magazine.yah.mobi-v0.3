import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification.
 *
 * Priority:
 *   1. Manus Forge (when BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY are set)
 *   2. Console warning only (graceful fallback for Firebase / Cloud Run)
 *
 * Returns `true` if delivered, `false` on transient upstream errors.
 * Validation errors bubble up as TRPCErrors.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // ── Manus Forge path ──────────────────────────────────────────────────
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[Notification] Forge failed (${response.status} ${response.statusText})${
            detail ? `: ${detail}` : ""
          }`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.warn("[Notification] Forge error:", error);
      return false;
    }
  }

  // ── Fallback: console only ──────────────────────────────────────────
  // In production, replace this block with your preferred channel
  // (SendGrid, Slack, Firebase Cloud Messaging, etc.)
  console.warn(
    `[Notification] BUILT_IN_FORGE_API_URL not set — owner notification suppressed.\n` +
    `  Title:   ${title}\n` +
    `  Content: ${content}`
  );
  return false;
}
