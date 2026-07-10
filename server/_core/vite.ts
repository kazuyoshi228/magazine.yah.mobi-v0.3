/**
 * Development-only Vite dev server integration.
 *
 * IMPORTANT: The `vite` package is a devDependency and is NOT installed in
 * production. To keep the production bundle free of any runtime dependency on
 * `vite`, this module:
 *   1. Performs the `import("vite")` dynamically *inside* setupVite(), so the
 *      module specifier never appears as a top-level static import that Node
 *      would eagerly resolve at startup.
 *   2. Is itself only ever imported via a dynamic `await import("./vite")` from
 *      index.ts, guarded by `NODE_ENV === "development"`.
 *
 * Result: in production (`NODE_ENV=production`) neither this file nor `vite` is
 * ever evaluated, eliminating the `Cannot find package 'vite'` error.
 */
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  // Dynamic import keeps the `vite` specifier out of the module's static
  // import graph, so it is only resolved when this dev-only code path runs.
  // Note: object destructuring renaming uses `:` (not `as`) for dynamic imports.
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // Always reload index.html from disk in case it changes.
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
