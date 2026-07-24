/**
 * Email delivery.
 *
 * Transport resolution, in order:
 *   1. Real SMTP when SMTP_HOST/USER/PASS are configured (production path).
 *   2. Otherwise a Nodemailer **Ethereal** test inbox, created on first send.
 *      Every message gets a real, clickable preview URL — so a live demo shows
 *      genuine rendered email without needing any credentials.
 *   3. If the machine is offline, the send is logged to the DB as PREVIEW so
 *      the product still works and the email is inspectable in-app.
 *
 * Every message is persisted to the `emails` table, which powers the in-app
 * Email Activity view.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "../db/client.js";
import { id, log } from "./core.js";

let transporter: Transporter | null = null;
let transportKind: "smtp" | "ethereal" | "none" = "none";

async function getTransport(): Promise<Transporter | null> {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" },
    });
    transportKind = "smtp";
    log("mailer", "using configured SMTP transport");
    return transporter;
  }

  try {
    const acct = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: acct.smtp.host, port: acct.smtp.port, secure: acct.smtp.secure,
      auth: { user: acct.user, pass: acct.pass },
    });
    transportKind = "ethereal";
    log("mailer", `using Ethereal test inbox (${acct.user}) — messages get preview URLs`);
    return transporter;
  } catch (e) {
    transportKind = "none";
    log("mailer", "no transport available (offline) — emails will be logged only");
    return null;
  }
}

const FROM = process.env.MAIL_FROM ?? "CoverFlow <notifications@coverflow.app>";
const WEB = process.env.WEB_ORIGIN ?? "http://localhost:3000";

/* ── Shared shell so every email looks like one product ── */
function shell(heading: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5fa;font-family:-apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fa;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0b0f19;padding:20px 28px">
      <span style="color:#fff;font-size:16px;font-weight:600;letter-spacing:-.02em">CoverFlow</span>
      <span style="color:rgba(255,255,255,.45);font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-left:10px">Benefit OS</span>
    </td></tr>
    <tr><td style="padding:32px 28px">
      <h1 style="margin:0 0 12px;font-size:21px;line-height:1.25;letter-spacing:-.02em;color:#111827">${heading}</h1>
      <div style="font-size:14.5px;line-height:1.65;color:#4b5563">${body}</div>
      ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#2d8cff;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:11px 20px;border-radius:8px">${cta.label}</a>` : ""}
    </td></tr>
    <tr><td style="border-top:1px solid #e5e7eb;padding:18px 28px;font-size:11.5px;color:#6b7280">
      CoverFlow · Benefit Intelligence Platform — protection activated automatically on eligible purchases.
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const templates = {
  welcome: (name: string, verifyUrl?: string) => ({
    subject: "Welcome to CoverFlow — your protections are live",
    html: shell(`Welcome, ${name}.`,
      `<p style="margin:0 0 12px">Your card is now monitored by CoverFlow. From here on, every eligible purchase is detected the moment it clears and the right protection switches on automatically — no forms, no reminders.</p>
       <p style="margin:0">${verifyUrl ? "Confirm your email to secure the account:" : "Open your dashboard to see it working."}</p>`,
      verifyUrl ? { label: "Verify email address", href: verifyUrl } : { label: "Open dashboard", href: `${WEB}/dashboard` }),
  }),
  verifyEmail: (name: string, url: string) => ({
    subject: "Confirm your CoverFlow email",
    html: shell("Confirm your email", `<p style="margin:0">Hi ${name}, confirm this address to secure your CoverFlow account. This link expires in 24 hours.</p>`,
      { label: "Verify email address", href: url }),
  }),
  resetPassword: (name: string, url: string) => ({
    subject: "Reset your CoverFlow password",
    html: shell("Reset your password",
      `<p style="margin:0 0 12px">Hi ${name}, we received a request to reset your password. This link expires in 60 minutes and can be used once.</p>
       <p style="margin:0;color:#6b7280">If you didn't request this, you can ignore this email — nothing has changed.</p>`,
      { label: "Choose a new password", href: url }),
  }),
  protectionActivated: (name: string, item: string, merchant: string, benefit: string, until: string, benefitId: string) => ({
    subject: `Protected: ${item}`,
    html: shell("Protection activated",
      `<p style="margin:0 0 16px">Hi ${name}, your purchase is covered.</p>
       <table role="presentation" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;font-size:14px">
         <tr><td style="color:#6b7280;padding:4px 0">Item</td><td align="right" style="color:#111827;font-weight:500">${item}</td></tr>
         <tr><td style="color:#6b7280;padding:4px 0">Merchant</td><td align="right" style="color:#111827">${merchant}</td></tr>
         <tr><td style="color:#6b7280;padding:4px 0">Coverage</td><td align="right" style="color:#2d8cff;font-weight:500">${benefit}</td></tr>
         <tr><td style="color:#6b7280;padding:4px 0">Protected until</td><td align="right" style="color:#111827">${until}</td></tr>
       </table>
       <p style="margin:16px 0 0;color:#6b7280">Your receipt is stored and the claim is already prepared if you ever need it.</p>`,
      { label: "View Benefit Passport", href: `${WEB}/wallet/${benefitId}` }),
  }),
  claimSubmitted: (name: string, type: string, item: string, amount: number, claimId: string) => ({
    subject: `Claim received — ${item}`,
    html: shell("Your claim is in review",
      `<p style="margin:0 0 12px">Hi ${name}, we received your ${type.replace(/_/g, " ").toLowerCase()} claim for <strong style="color:#111827">${item}</strong>.</p>
       <p style="margin:0 0 12px">Requested amount: <strong style="color:#111827">${money(amount)}</strong></p>
       <p style="margin:0;color:#6b7280">Everything was pre-filled from your Benefit Passport — merchant, date, receipt and coverage. Typical decision time is 2 business days.</p>`,
      { label: "Track this claim", href: `${WEB}/claims/${claimId}` }),
  }),
  claimDecision: (name: string, approved: boolean, item: string, amount: number, note: string | null, claimId: string) => ({
    subject: approved ? `Claim approved — ${item}` : `Claim decision — ${item}`,
    html: shell(approved ? "Your claim was approved" : "Claim decision",
      approved
        ? `<p style="margin:0 0 12px">Good news, ${name} — your claim for <strong style="color:#111827">${item}</strong> was approved.</p>
           <p style="margin:0 0 12px">Reimbursement of <strong style="color:#059669">${money(amount)}</strong> is on its way.</p>
           ${note ? `<p style="margin:0;color:#6b7280">${note}</p>` : ""}`
        : `<p style="margin:0 0 12px">Hi ${name}, your claim for <strong style="color:#111827">${item}</strong> was not approved.</p>
           ${note ? `<p style="margin:0 0 12px"><strong style="color:#111827">Reason:</strong> ${note}</p>` : ""}
           <p style="margin:0;color:#6b7280">You can reply to this email or contact support to appeal.</p>`,
      { label: "View claim", href: `${WEB}/claims/${claimId}` }),
  }),
  coverageExpiring: (name: string, item: string, benefit: string, days: number, benefitId: string) => ({
    subject: `${days} day${days === 1 ? "" : "s"} left — ${item} coverage`,
    html: shell("Coverage ending soon",
      `<p style="margin:0 0 12px">Hi ${name}, the <strong style="color:#111827">${benefit}</strong> on your <strong style="color:#111827">${item}</strong> ends in ${days} day${days === 1 ? "" : "s"}.</p>
       <p style="margin:0;color:#6b7280">If anything is wrong with it, file now — the claim is already prepared and takes about a minute.</p>`,
      { label: "Review protection", href: `${WEB}/wallet/${benefitId}` }),
  }),
};

/** Send + persist. Never throws — email must not break a product flow. */
export async function sendMail(opts: {
  to: string; userId?: string | null; template: string;
  subject: string; html: string;
}): Promise<{ ok: boolean; previewUrl?: string }> {
  const rowId = id();
  try {
    const tx = await getTransport();
    if (!tx) {
      db.prepare(`INSERT INTO emails (id, user_id, to_address, subject, template, body_html, status) VALUES (?,?,?,?,?,?, 'PREVIEW')`)
        .run(rowId, opts.userId ?? null, opts.to, opts.subject, opts.template, opts.html);
      return { ok: false };
    }
    const info = await tx.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
    const preview = transportKind === "ethereal" ? (nodemailer.getTestMessageUrl(info) || null) : null;
    db.prepare(`INSERT INTO emails (id, user_id, to_address, subject, template, body_html, preview_url, status) VALUES (?,?,?,?,?,?,?, 'SENT')`)
      .run(rowId, opts.userId ?? null, opts.to, opts.subject, opts.template, opts.html, preview);
    log("mailer", `sent ${opts.template} → ${opts.to}`, preview ? { preview } : {});
    return { ok: true, previewUrl: preview ?? undefined };
  } catch (e: any) {
    db.prepare(`INSERT INTO emails (id, user_id, to_address, subject, template, body_html, status, error) VALUES (?,?,?,?,?,?, 'FAILED', ?)`)
      .run(rowId, opts.userId ?? null, opts.to, opts.subject, opts.template, opts.html, String(e?.message ?? e));
    log("mailer", `FAILED ${opts.template} → ${opts.to}: ${e?.message ?? e}`);
    return { ok: false };
  }
}

export const mailerKind = () => transportKind;
