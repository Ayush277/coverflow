/** Server-Sent Events — real-time updates to the web app (transactions, benefits, notifications). */
import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/core.js";
import type { Response } from "express";

const clients = new Map<string, Set<Response>>();

export function sseBroadcast(userId: string, event: string, data: unknown) {
  const set = clients.get(userId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}

export const streamRouter = Router();

// EventSource can't set headers — token arrives as a query param.
streamRouter.get("/", (req, res) => {
  const token = String(req.query.token ?? "");
  let userId: string;
  try { userId = (jwt.verify(token, config.jwtSecret) as any).sub; }
  catch { return res.status(401).end(); }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: connected\ndata: {}\n\n`);

  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
  const ping = setInterval(() => res.write(`: ping\n\n`), 25000);

  req.on("close", () => {
    clearInterval(ping);
    clients.get(userId)?.delete(res);
  });
});
