const axios = require("axios");

const sendEmail = async ({ to, subject, html, text }) => {
  const token = process.env.MAILTRAP_TOKEN;

  if (!token) {
    throw new Error("Mailtrap API configuration is missing MAILTRAP_TOKEN.");
  }

  try {
    const response = await axios.post(
      "https://send.api.mailtrap.io/api/send",
      {
        from: {
          email: process.env.FROM_EMAIL || "support@codesenate.com",
          name: "Colo71 Support",
        },
        to: [
          {
            email: Array.isArray(to) ? to[0] : to,
          },
        ],
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    console.log("Mailtrap API accepted email:", response.status);
    return response.data;
  } catch (error) {
    console.error(
      "Mailtrap API email failed:",
      error.response
        ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
        : error.message,
    );
    throw error;
  }
};

module.exports = { sendEmail };
