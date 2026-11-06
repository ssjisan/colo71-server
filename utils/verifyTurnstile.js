const axios = require("axios");

const verifyTurnstile = async (token) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error("Turnstile secret key is not configured.");
  }

  if (!token || typeof token !== "string") {
    return false;
  }

  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret,
        response: token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      },
    );

    return response.data?.success === true;
  } catch (error) {
    console.error(
      "Turnstile verification failed:",
      error.response?.data || error.message,
    );

    // Do not accept submissions if verification is unavailable.
    throw new Error("CAPTCHA verification service is unavailable.");
  }
};

module.exports = verifyTurnstile;
