
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return map[char];
  });

const emailLayout = ({ title, subtitle, content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:30px 12px;background:#F4F4FC;font-family:Arial,Helvetica,sans-serif;color:#171B62">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:680px;background:#fff;border-radius:14px">
          <tr>
            <td style="padding:32px">
              <h1 style="margin:0 0 12px;font-size:25px;color:#171B62">
                ${escapeHtml(title)}
              </h1>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#6B70B5">
                ${escapeHtml(subtitle)}
              </p>

              ${content}

              <p style="margin:30px 0 0;color:#6B70B5;font-size:13px;line-height:1.7">
                Best regards,<br />
                <strong style="color:#171B62">Colo71 Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#F8F7FF;border-radius:0 0 14px 14px">
              <p style="margin:0;text-align:center;font-size:11px;color:#8589B5">
                © ${new Date().getFullYear()} Colo71. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const visitorAcknowledgementTemplate = (enquiry) => ({
  subject: "We've received your enquiry | Colo71",

  text: `Hello ${enquiry.name},

Thank you for contacting Colo71.

We have successfully received your enquiry.

Reference ID: ${enquiry.referenceId}
Enquiry type: ${enquiry.enquiryType.name}

Our team will review your message and get back to you.

Best regards,
Colo71 Team`,

  html: emailLayout({
    title: "We've received your enquiry",
    subtitle:
      "Thank you for getting in touch with Colo71. Your enquiry has been successfully submitted.",
    content: `
      <div style="padding:20px;background:#F8F7FF;border-radius:10px">
        <p style="margin:0 0 12px;color:#6B70B5;font-size:13px">
          Hello,
        </p>

        <h2 style="margin:0 0 20px;color:#171B62;font-size:23px">
          ${escapeHtml(enquiry.name)}
        </h2>

        <p style="margin:0 0 10px;font-size:14px;color:#6B70B5">
          Reference ID
        </p>

        <strong style="font-size:18px;color:#652EFF">
          ${escapeHtml(enquiry.referenceId)}
        </strong>

        <hr style="border:0;border-top:1px solid #E8E5FF;margin:20px 0" />

        <p style="margin:0;color:#6B70B5;font-size:14px">
          Enquiry type
        </p>

        <strong style="display:block;margin-top:6px;color:#171B62">
          ${escapeHtml(enquiry.enquiryType.name)}
        </strong>
      </div>

      <p style="margin:24px 0 0;font-size:14px;line-height:1.8;color:#6B70B5">
        Our team will review your enquiry and get back to you as soon as possible.
      </p>
    `,
  }),
});

const adminEnquiryNotificationTemplate = (enquiry) => ({
  subject: `New Website Enquiry - ${enquiry.name.replace(/[\r\n]/g, " ")}`,

  text: `A new website enquiry has been submitted.

Reference ID: ${enquiry.referenceId}
Name: ${enquiry.name}
Email: ${enquiry.email}
Company: ${enquiry.company || "Not provided"}
Phone: ${enquiry.phone || "Not provided"}
Enquiry type: ${enquiry.enquiryType.name}

Message:
${enquiry.message}`,

  html: emailLayout({
    title: "New Website Enquiry",
    subtitle: "A visitor has submitted a new enquiry through the Colo71 website.",
    content: `
      <table width="100%" cellspacing="0" cellpadding="10"
        style="background:#F8F7FF;border-radius:10px;font-size:14px">

        <tr>
          <td style="color:#6B70B5">Reference ID</td>
          <td style="color:#171B62;font-weight:bold">
            ${escapeHtml(enquiry.referenceId)}
          </td>
        </tr>

        <tr>
          <td style="color:#6B70B5">Name</td>
          <td style="color:#171B62">${escapeHtml(enquiry.name)}</td>
        </tr>

        <tr>
          <td style="color:#6B70B5">Email</td>
          <td>
            <a href="mailto:${escapeHtml(enquiry.email)}"
              style="color:#652EFF">
              ${escapeHtml(enquiry.email)}
            </a>
          </td>
        </tr>

        <tr>
          <td style="color:#6B70B5">Company</td>
          <td style="color:#171B62">
            ${escapeHtml(enquiry.company || "Not provided")}
          </td>
        </tr>

        <tr>
          <td style="color:#6B70B5">Phone</td>
          <td style="color:#171B62">
            ${escapeHtml(enquiry.phone || "Not provided")}
          </td>
        </tr>

        <tr>
          <td style="color:#6B70B5">Enquiry type</td>
          <td style="color:#171B62">
            ${escapeHtml(enquiry.enquiryType.name)}
          </td>
        </tr>
      </table>

      <div style="margin-top:24px;padding:20px;border:1px solid #E8E5FF;border-radius:10px">
        <h3 style="margin:0 0 12px;color:#171B62;font-size:16px">
          Message
        </h3>

        <p style="margin:0;color:#6B70B5;font-size:14px;line-height:1.8;white-space:pre-wrap">
          ${escapeHtml(enquiry.message)}
        </p>
      </div>
    `,
  }),
});

module.exports = {
  visitorAcknowledgementTemplate,
  adminEnquiryNotificationTemplate,
};
