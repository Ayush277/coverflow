import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { db, migrate } from "./db/client.js";
import { config, log } from "./lib/core.js";
import { authRouter } from "./routes/auth.js";
import { appRouter } from "./routes/app.js";
import { adminRouter } from "./routes/admin.js";
import { streamRouter } from "./routes/stream.js";
import { storeRouter } from "./routes/store.js";
import { shareRouter, publicShareRouter } from "./routes/share.js";
import { registerConsumers } from "./events/consumers.js";
import { startAmbientStream } from "./events/simulator.js";
import { seedIfEmpty } from "./db/seed.js";
import { seedCatalog } from "./db/catalog.js";

migrate();
seedCatalog();
seedIfEmpty();
registerConsumers();
startAmbientStream();

const app = express();
// Auth is stateless (JWT in the Authorization header, no cookies), so reflecting
// any origin is safe here and means the web app works no matter what URL Vercel
// assigns it — one less thing to misconfigure at deploy time.
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.use((req, _res, next) => { log("http", `${req.method} ${req.path}`); next(); });

app.get("/health", (_req, res) => res.json({ ok: true, service: "coverflow-api", db: !!db.open }));
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/stream", streamRouter);
app.use("/api/store", storeRouter);
app.use("/api/share", shareRouter);
app.use("/api/public/proof", publicShareRouter);
app.use("/api", appRouter);

app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Route not found" }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(422).json({ error: "VALIDATION", message: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ") });
  }
  log("error", String(err));
  res.status(500).json({ error: "INTERNAL", message: "Something went wrong" });
});

app.listen(config.port, () => log("boot", `CoverFlow API listening on :${config.port}`));
