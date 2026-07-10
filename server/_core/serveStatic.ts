/**
 * Production-only static file serving.
 * This file must NOT import anything from 'vite' or 'vite.config.ts'
 * so that the esbuild bundle does not require vite at runtime.
 */
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production (Cloud Run / Firebase App Hosting), the Vite build outputs to
  // dist/public relative to the project root. The esbuild bundle lands at dist/index.js,
  // so __dirname resolves to the dist/ directory — meaning "public" is a sibling.
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // SPA fallback — serve index.html for any unmatched route
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
