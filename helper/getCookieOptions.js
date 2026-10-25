const getCookieOptions = (req) => {
  const origin = req?.get?.("origin") || "";

  const isLocalhostFrontend =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || isLocalhostFrontend,
    sameSite: isLocalhostFrontend ? "none" : "lax",
    path: "/",
  };
};

module.exports = { getCookieOptions };
