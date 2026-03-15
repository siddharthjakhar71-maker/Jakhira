import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  let distPath: string;
  if (process.env.APP_STATIC_DIR) {
    distPath = process.env.APP_STATIC_DIR;
  } else if ((process as any).pkg) {
    distPath = path.join(path.dirname(process.execPath), "public");
  } else {
    distPath = path.resolve(__dirname, "public");
  }

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
