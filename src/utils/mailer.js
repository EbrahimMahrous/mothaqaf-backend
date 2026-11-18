// ─────────────────────────────────────────────────────────────
// Brevo REST API client — no SDK dependency
// Docs: https://developers.brevo.com/reference
// ─────────────────────────────────────────────────────────────

const BREVO_BASE_URL = "https://api.brevo.com/v3";

// ─── Low-level helper ──────────────────────────────────────
const brevoFetch = async (endpoint, options = {}) => {
  const res = await fetch(`${BREVO_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const error = new Error(
      `Brevo ${res.status}: ${data?.message || data?.error || res.statusText}`,
    );
    error.status = res.status;
    error.body = data;
    throw error;
  }

  return data;
};

// ─── Send transactional email ──────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  const recipients = Array.isArray(to) ? to : [{ email: to }];

  return brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: {
        name: process.env.MAIL_FROM_NAME || "مثقف",
        email: process.env.MAIL_FROM,
      },
      to: recipients,
      subject,
      htmlContent: html,
    }),
  });
};

// ─── Bulk send (batches of 90) ─────────────────────────────
// Brevo allows up to 100 recipients per call; we use 90 for safety.
const sendBulkEmail = async ({ emails, subject, html }) => {
  const BATCH_SIZE = 90;
  const results = { sent: 0, failed: 0, errors: [] };

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE).map((email) => ({ email }));
    try {
      await sendEmail({ to: batch, subject, html });
      results.sent += batch.length;
    } catch (err) {
      console.error("Batch failed:", err.status || "", err.message);
      results.failed += batch.length;
      results.errors.push(err.message);
    }
  }

  return results;
};

// ─── Create/Update a contact in Brevo ──────────────────────
const upsertContact = async (email) => {
  try {
    // POST /contacts — creates if new, updates if exists (with updateEnabled)
    await brevoFetch("/contacts", {
      method: "POST",
      body: JSON.stringify({
        email,
        listIds: [parseInt(process.env.BREVO_LIST_ID || "2", 10)],
        updateEnabled: true,
      }),
    });
    return { success: true, created: true };
  } catch (err) {
    // 400 with code "duplicate_parameter" = contact already exists → OK
    if (
      err.status === 400 &&
      (err.body?.code === "duplicate_parameter" ||
        /already exist/i.test(err.body?.message || ""))
    ) {
      return { success: true, created: false, existing: true };
    }
    throw err;
  }
};

module.exports = { sendEmail, sendBulkEmail, upsertContact };
