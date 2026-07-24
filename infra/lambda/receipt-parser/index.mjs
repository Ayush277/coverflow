/**
 * λ receipt-parser — AWS Lambda handler.
 * Trigger: S3 put on the receipts bucket (or Pub/Sub push via API Gateway).
 * Parses the uploaded receipt, extracts structured fields, POSTs the result
 * back to the CoverFlow API which links it to the matching transaction.
 *
 * Locally the same logic runs in-process (services/api/src/events/consumers.ts,
 * "λ-receipt-parser"); this module is the cloud deployment target.
 */
const API_URL = process.env.COVERFLOW_API_URL;
const SERVICE_TOKEN = process.env.COVERFLOW_SERVICE_TOKEN;

export async function handler(event) {
  const records = event.Records ?? [];
  const results = [];
  for (const record of records) {
    const key = decodeURIComponent(record.s3?.object?.key ?? "");
    if (!key) continue;
    const res = await fetch(`${API_URL}/api/internal/receipts/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ s3Key: key, bucket: record.s3.bucket.name }),
    });
    results.push({ key, status: res.status });
  }
  return { statusCode: 200, body: JSON.stringify({ processed: results.length, results }) };
}
