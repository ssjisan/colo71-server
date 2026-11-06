
const axios = require("axios");

const sendContactEmail = async ({ to, subject, html, text, replyTo }) => {
  const token = process.env.MAILTRAP_TOKEN;

  if (!token) {
    throw new Error("MAILTRAP_TOKEN is not configured.");
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .filter((email) => typeof email === "string" && email.trim())
    .map((email) => ({ email: email.trim() }));

  if (!recipients.length) {
    throw new Error("No valid email recipients provided.");
  }

  const payload = {
    from: {
      email: process.env.FROM_EMAIL || "support@codesenate.com",
      name: "Colo71 Support",
    },
    to: recipients,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo
      ? {
          reply_to: {
            email: replyTo,
          },
        }
      : {}),
  };

  const response = await axios.post(
    "https://send.api.mailtrap.io/api/send",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  return response.data;
};

module.exports = sendContactEmail;
