/**
 * Receipt Intelligence — OCR pipeline.
 * If AI_SERVICE_URL (FastAPI OCR microservice) is configured it is used first;
 * otherwise falls back to the built-in extractor so the pipeline always works.
 */
import { config } from "../lib/core.js";

export interface OcrResult {
  merchant: string | null; invoice_number: string | null; amount: number | null;
  purchase_date: string | null; serial_number: string | null; items: string[]; confidence: number;
}

export async function extractReceipt(fileName: string, buffer: Buffer, hint?: { merchant?: string; amount?: number; date?: string }): Promise<OcrResult> {
  if (config.aiServiceUrl) {
    try {
      const form = new FormData();
      form.append("file", new Blob([buffer]), fileName);
      const res = await fetch(`${config.aiServiceUrl}/ocr/extract`, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json() as OcrResult;
    } catch { /* fall through to local extractor */ }
  }
  return localExtract(fileName, buffer, hint);
}

/** Deterministic local extractor: parses text content when present, else derives from filename + hint. */
function localExtract(fileName: string, buffer: Buffer, hint?: { merchant?: string; amount?: number; date?: string }): OcrResult {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 20000));
  const isText = /^[\x09\x0A\x0D\x20-\x7E -￿]*$/.test(text.slice(0, 500));

  const find = (re: RegExp) => (isText ? text.match(re)?.[1]?.trim() ?? null : null);
  const merchant = find(/(?:merchant|store|sold by|from)[:\s]+([A-Za-z0-9 .&'-]{2,40})/i)
    ?? hint?.merchant ?? titleFromFilename(fileName);
  const invoice = find(/(?:invoice|order|receipt)\s*(?:no\.?|number|#)?[:\s]*([A-Z0-9-]{4,24})/i)
    ?? `INV-${Math.abs(hash(fileName)).toString(36).toUpperCase().slice(0, 8)}`;
  const amountStr = find(/(?:total|amount|grand total)[:\s]*(?:₹|Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const amount = amountStr ? Number(amountStr.replace(/,/g, "")) : hint?.amount ?? null;
  const date = find(/(?:date|purchased on)[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ?? hint?.date ?? null;
  const serial = find(/(?:serial|s\/n|sn)[:\s#]*([A-Z0-9-]{6,24})/i);
  const items = isText ? (text.match(/^\s*\d+\s*x\s+(.+)$/gim)?.map(l => l.replace(/^\s*\d+\s*x\s+/i, "").trim()).slice(0, 10) ?? []) : [];

  const found = [merchant, invoice, amount, date].filter(Boolean).length;
  return { merchant, invoice_number: invoice, amount, purchase_date: date, serial_number: serial, items, confidence: Math.min(0.98, 0.55 + found * 0.1) };
}

const titleFromFilename = (f: string) =>
  f.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/receipt|invoice|scan/gi, "").trim().replace(/\b\w/g, c => c.toUpperCase()) || null;

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
