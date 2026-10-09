const nodemailer = require("nodemailer");

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;
const fromEmail = process.env.FROM_EMAIL;

console.log("EMAIL CONFIG CHECK");
console.log("Gmail user:", gmailUser);
console.log("Gmail password:", gmailPassword ? "LOADED" : "MISSING");
console.log("From email:", fromEmail);

if (!gmailUser || !gmailPassword) {
  throw new Error(
    "Gmail SMTP credentials are missing. Check GMAIL_USER and GMAIL_APP_PASSWORD.",
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: gmailUser,
    pass: gmailPassword,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: fromEmail || gmailUser,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
