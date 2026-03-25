import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { MAX_PROFILE_IMAGE_BYTES } from "./lib/profile-image";
import type { SessionUser } from "./auth-middleware";

const MemoryStore = createMemoryStore(session);
const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

app.use(
  session({
    name: "jakhira.sid",
    secret: process.env.SESSION_SECRET || "jakhira-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 12,
      secure: process.env.NODE_ENV === "production",
    },
    store: new MemoryStore({ checkPeriod: 1000 * 60 * 60 * 24 }),
  }),
);

app.use(
  express.json({
    limit: `${Math.ceil(MAX_PROFILE_IMAGE_BYTES * 1.5)}b`,
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true, limit: `${Math.ceil(MAX_PROFILE_IMAGE_BYTES * 1.5)}b` }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    if (err?.type === "entity.too.large") {
      return res.status(413).json({
        message: `Request payload is too large. Keep profile images under ${Math.round(MAX_PROFILE_IMAGE_BYTES / (1024 * 1024))}MB or switch to multipart/form-data uploads.`,
        profileImage: {
          maxBytes: MAX_PROFILE_IMAGE_BYTES,
          maxMegabytes: MAX_PROFILE_IMAGE_BYTES / (1024 * 1024),
        },
        recommendedUploadMode: "multipart/form-data",
      });
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
