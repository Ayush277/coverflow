/**
 * λ notification-scheduler — AWS Lambda handler.
 * Trigger: EventBridge schedule (rate(1 hour)).
 * Asks the CoverFlow API to run the expiry sweep: benefits ending within 7 days
 * get personalized reminders, expired coverage is transitioned.
 *
 * Locally the same sweep runs on an in-process interval
 * (services/api/src/events/consumers.ts, "λ-notification-scheduler").
 */
const API_URL = process.env.COVERFLOW_API_URL;
const SERVICE_TOKEN = process.env.COVERFLOW_SERVICE_TOKEN;

export async function handler() {
  const res = await fetch(`${API_URL}/api/internal/notifications/sweep`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
  });
  const body = await res.json().catch(() => ({}));
  return { statusCode: res.status, body: JSON.stringify(body) };
}
