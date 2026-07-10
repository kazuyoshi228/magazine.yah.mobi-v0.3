/**
 * Storage abstraction layer.
 *
 * Supports two backends, selected by the STORAGE_PROVIDER environment variable:
 *   - "manus"  (default) — Manus Forge presigned S3 proxy (used in Manus WebDev)
 *   - "s3"               — Direct AWS S3 (used in Firebase / Cloud Run production)
 *
 * Both backends expose the same interface:
 *   storagePut(relKey, data, contentType?) → { key, url }
 *   storageGet(relKey)                     → { key, url }
 *   storageGetSignedUrl(relKey)            → string (direct signed URL)
 *
 * URL convention:
 *   - Manus backend:  /manus-storage/{key}  (served by storageProxy.ts)
 *   - S3 backend:     /storage/{key}        (served by storageProxyS3.ts or CDN)
 */

import { ENV } from "./_core/env";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function getProvider(): "manus" | "s3" {
  const p = (process.env.STORAGE_PROVIDER ?? "manus").toLowerCase();
  return p === "s3" ? "s3" : "manus";
}

// ─── Manus Forge backend ──────────────────────────────────────────────────────

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY (or switch STORAGE_PROVIDER=s3)",
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

async function manusPut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([Buffer.from(data as Uint8Array)], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

async function manusGetSignedUrl(key: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}

// ─── AWS S3 backend ───────────────────────────────────────────────────────────

function getS3Config() {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? "ap-northeast-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket) {
    throw new Error("S3 config missing: set AWS_S3_BUCKET");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 config missing: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
    );
  }
  return { bucket, region, accessKeyId, secretAccessKey };
}

async function s3Put(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { bucket, region, accessKeyId, secretAccessKey } = getS3Config();

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const body =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return { key, url: `/storage/${key}` };
}

async function s3GetSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { bucket, region, accessKeyId, secretAccessKey } = getS3Config();

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (getProvider() === "s3") {
    return s3Put(key, data, contentType);
  }
  return manusPut(key, data, contentType);
}

export async function storageGet(
  relKey: string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const prefix = getProvider() === "s3" ? "/storage" : "/manus-storage";
  return { key, url: `${prefix}/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (getProvider() === "s3") {
    return s3GetSignedUrl(key);
  }
  return manusGetSignedUrl(key);
}
