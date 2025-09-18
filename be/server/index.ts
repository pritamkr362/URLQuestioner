import express, { type Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();
import { registerRoutes } from "./routes";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const log = (msg: string) => console.log(msg);
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = process.env.UI_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) || [];
      if (!origin) return cb(null, true); // allow same-origin/non-browser
      if (allowed.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger setup (serve at /docs)
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const specPath = path.resolve(__dirname, 'openapi.json');
  if (fs.existsSync(specPath)) {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
  }
} catch (e) {
  log(`Swagger setup skipped: ${(e as Error).message}`);
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt((process.env.PORT || '5000').trim(), 10);
  const host = ((process.env.HOST || '0.0.0.0') as string).trim() || '0.0.0.0';
  const startMessage = () => log(`serving on http://${host}:${port}`);
  if (process.platform === 'win32' && (host === '0.0.0.0' || host === '::')) {
    server.listen(port, startMessage);
  } else {
    const listenOptions: any = { port, host };
    if (process.platform !== 'win32') {
      listenOptions.reusePort = true;
    }
    server.listen(listenOptions, startMessage);
  }
})();
