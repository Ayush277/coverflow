/**
 * λ claim-preprocessor — AWS Lambda handler.
 * Trigger: Pub/Sub push subscription on claims.submitted (via HTTPS endpoint).
 * Runs fraud scoring + document completeness checks and moves the claim
 * into IN_REVIEW with an auto-generated event log entry.
 *
 * Locally the same preprocessing runs synchronously on submission
 * (services/api/src/routes/app.ts POST /claims + engines/fraud.ts).
 */
const API_URL = process.env.COVERFLOW_API_URL;
const SERVICE_TOKEN = process.env.COVERFLOW_SERVICE_TOKEN;

export async function handler(event) {
  // Pub/Sub push envelope: { message: { data: base64(JSON) } }
  const payload = JSON.parse(Buffer.from(event.message?.data ?? "", "base64").toString() || "{}");
  if (!payload.claim_id) return { statusCode: 400, body: "missing claim_id" };

  const res = await fetch(`${API_URL}/api/internal/claims/${payload.claim_id}/preprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
  });
  return { statusCode: res.status, body: await res.text() };
}
