/**
 * S3 storage proxy for production (Firebase App Hosting / Cloud Run).
 *
 * When STORAGE_PROVIDER=s3, this route handles GET /storage/* by
 * generating a presigned S3 URL and redirecting the client to it.
 *
 * Register this alongside storageProxy.ts in server/_core/index.ts.
 * The Manus proxy (storageProxy.ts) continues to handle /manus-storage/*.
 */

import type { Express } from "express";

export function registerStorageProxyS3(app: Express) {
  if ((process.env.STORAGE_PROVIDER ?? "manus").toLowerCase() !== "s3") {
    return; // Only active when STORAGE_PROVIDER=s3
  }

  app.get("/storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION ?? "ap-northeast-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      res.status(500).send("S3 storage proxy not configured");
      return;
    }

    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      const signedUrl = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: 3600 },
      );

      res.set("Cache-Control", "no-store");
      res.redirect(307, signedUrl);
    } catch (err) {
      console.error("[StorageProxyS3] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
