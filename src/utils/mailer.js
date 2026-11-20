const BREVO_BASE_URL = "https://api.brevo.com/v3";

const brevoFetch = async (endpoint, options = {}) => {
  const mailFrom = process.env.MAIL_FROM;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!mailFrom || !emailRegex.test(mailFrom)) {
    throw new Error(`MAIL_FROM غير صالح: "${mailFrom}"`);
  }
  if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY غير موجود");

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
    const err = new Error(
      `Brevo ${res.status}: ${data?.message || res.statusText}`,
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
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
      attachment: attachments.map((a) => ({ url: a.url, name: a.name })),
    }),
  });
};

const sendBulkEmail = async ({ emails, subject, html, attachments = [] }) => {
  const BATCH_SIZE = 90;
  const results = { sent: 0, failed: 0, errors: [] };
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE).map((email) => ({ email }));
    try {
      await sendEmail({ to: batch, subject, html, attachments });
      results.sent += batch.length;
    } catch (err) {
      console.error("Batch failed:", err.status || "", err.message);
      results.failed += batch.length;
      results.errors.push(err.message);
    }
  }
  return results;
};

const upsertContact = async (email) => {
  try {
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
