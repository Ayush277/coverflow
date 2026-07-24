import Database from "better-sqlite3";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, "../../data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "coverflow.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, at TEXT DEFAULT (datetime('now')))`);
  const applied = new Set(db.prepare(`SELECT name FROM _migrations`).all().map((r: any) => r.name));
  const dir = join(__dir, "migrations");
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".sql") || applied.has(file)) continue;
    db.exec(readFileSync(join(dir, file), "utf8"));
    db.prepare(`INSERT INTO _migrations (name) VALUES (?)`).run(file);
    console.log(`[db] applied migration ${file}`);
  }
}

export function j<T = unknown>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
