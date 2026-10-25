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

const BRAND = {
  navy: "#171B62",
  purple: "#652EFF",
  purpleDark: "#4820C7",
  lavender: "#F5F3FF",
  muted: "#6B70B5",
  border: "#E8E5FF",
};

const detailRow = (icon, label, value, isEmail = false) => {
  const safeValue = escapeHtml(value || "—");
  const displayValue = isEmail
    ? `<a href="mailto:${safeValue}" style="color:${BRAND.purple};font-weight:700;text-decoration:underline;overflow-wrap:anywhere">${safeValue}</a>`
    : `<span style="color:${BRAND.navy};font-weight:600;overflow-wrap:anywhere;white-space:pre-wrap">${safeValue}</span>`;

  return `
    <tr>
      <td width="72" valign="middle" style="padding:10px 0;border-bottom:1px solid ${BRAND.border}">
        <div style="width:46px;height:46px;line-height:46px;text-align:center;border-radius:50%;background:#EAE4FF;color:${BRAND.purple};font-size:22px">
          ${icon}
        </div>
      </td>
      <td width="34%" valign="middle" style="padding:15px 8px;border-bottom:1px solid ${BRAND.border};font-size:15px;color:${BRAND.muted}">
        ${label}
      </td>
      <td valign="middle" style="padding:15px 0 15px 8px;border-bottom:1px solid ${BRAND.border};font-size:15px;line-height:1.6">
        ${displayValue}
      </td>
    </tr>
  `;
};

const emailLayout = ({
  title,
  subtitle,
  content,
  heroIcon = "▦",
  heroTitle = title,
  preheader = "",
}) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${escapeHtml(title)}</title>
    </head>

    <body style="margin:0;padding:0;background:#F4F4FC;font-family:Arial,Helvetica,sans-serif;color:${BRAND.navy}">
      <div style="display:none;font-size:1px;color:#F4F4FC;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F4FC">
        <tr>
          <td align="center" style="padding:28px 12px">

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:920px;background:#FFFFFF;border-radius:18px">
              <!-- Brand header -->
              <tr>
                <td style="padding:30px 32px 26px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td valign="middle" style="padding:30px 32px;">
      <img
        src="https://www.freepnglogos.com/uploads/google-logo-png/file-google-logo-svg-wikimedia-commons-23.png"
        alt="Colo71"
        width="138"
        height="32"
        border="0"
        style="display:block;width:138px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;"
      />
    </td>
  </tr>
</table>
                </td>
              </tr>

              <!-- Purple hero -->
              <tr>
                <td style="padding:0 17px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:12px;background:${BRAND.purpleDark};background-image:linear-gradient(115deg,#4320BA 0%,#702EFF 60%,#5124D6 100%)">
                    <tr>
                      <td style="padding:32px 30px 34px">
                        <div style="width:72px;height:72px;line-height:72px;text-align:center;background:rgba(255,255,255,0.18);border-radius:13px;color:#FFFFFF;font-size:38px;margin-bottom:18px">
                          ${heroIcon}
                        </div>

                        <h1 style="margin:0 0 15px;color:#FFFFFF;font-size:clamp(26px,4vw,40px);line-height:1.2;letter-spacing:-0.8px">
                          ${escapeHtml(heroTitle)}
                        </h1>

                        <p style="margin:0;color:#FFFFFF;font-size:18px;line-height:1.7">
                          ${escapeHtml(subtitle)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main content -->
              <tr>
                <td style="padding:20px 17px 0">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${BRAND.border};border-radius:14px">
                    <tr>
                      <td style="padding:30px 30px 32px">
                        ${content}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:18px 17px 26px">
                 

                      </td>
                    </tr>
                  </table>
                  <p style="margin:18px 0 0;text-align:center;color:#8589B5;font-size:11px;line-height:1.6">
  © ${new Date().getFullYear()}
  <a
    href="https://codesenate.com/"
    target="_blank"
    style="color:#652EFF;text-decoration:none;font-weight:600"
  >
    CodeSenate
  </a>
  · All rights reserved.
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

const visitorAcknowledgementTemplate = (request) => ({
  subject: "We've received your facility visit request | Colo71",

  text: `Hello ${request.name},

Thank you for your interest in visiting Colo71.

We have successfully received your facility visit request.

Requested date: ${request.visitDate}
Requested time: ${request.visitTime}
Purpose: ${request.purpose}

Your visit is not yet confirmed. Our team will review your request and send you a separate confirmation email.

Best regards,
Colo71 Team`,

  html: emailLayout({
    title: "Your request has been received",
    heroTitle: "Visit Request Received",
    heroIcon: "✓",
    subtitle:
      "Thank you for choosing Colo71. Your facility visit request has been submitted successfully.",
    preheader: "We've received your facility visit request.",
    content: `
      <p style="margin:0 0 8px;font-size:18px;color:${BRAND.muted}">
        Hello,
      </p>

      <h2 style="margin:0 0 14px;font-size:30px;line-height:1.3;letter-spacing:-0.5px;color:${BRAND.navy}">
        ${escapeHtml(request.name)}
      </h2>

      <p style="margin:0 0 28px;font-size:17px;line-height:1.7;color:${BRAND.muted}">
        Thank you for your interest in visiting Colo71. The details of your request are below.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8F7FF;border-radius:14px;padding:10px 18px">
        ${detailRow("✉", "Email", request.email, true)}
        ${detailRow("▣", "Visit date", request.visitDate)}
        ${detailRow("◷", "Visit time", request.visitTime)}
        ${detailRow("▤", "Purpose", request.purpose)}
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:32px">
        <tr>
          <td width="5" style="background:${BRAND.purple};border-radius:4px"></td>
          <td style="padding:8px 0 8px 18px;font-size:15px;line-height:1.8;color:${BRAND.muted}">
            <strong style="color:${BRAND.navy}">Your visit is not yet confirmed.</strong><br>
            Our team will review your request and send you a separate confirmation email.
          </td>
        </tr>
      </table>

      <p style="margin:28px 0 0;font-size:15px;line-height:1.8;color:${BRAND.navy}">
        Best regards,<br>
        <strong>Colo71 Team</strong>
      </p>
    `,
  }),
});

const adminVisitNotificationTemplate = (request) => ({
  subject: `New Facility Visit Request - ${request.name}`,

  text: `A new facility visit request has been submitted.

Name: ${request.name}
Email: ${request.email}
Phone: ${request.phone}
Organization: ${request.organization || "Not provided"}
Visit date: ${request.visitDate}
Visit time: ${request.visitTime}
Purpose: ${request.purpose}

Please review this request in the admin panel.

Colo71 Facility Visit Scheduler`,

  html: emailLayout({
    title: "New facility visit request",
    heroTitle: "New Facility Visit Request",
    heroIcon: "▦",
    subtitle:
      "A new facility visit request has been submitted. Please review the details below.",
    preheader: `New visit request from ${request.name}.`,
    content: `
      <p style="margin:0 0 8px;font-size:18px;color:${BRAND.muted}">
        Hello,
      </p>

      <h2 style="margin:0 0 12px;font-size:30px;line-height:1.3;letter-spacing:-0.5px;color:${BRAND.navy}">
        ${escapeHtml(request.name)}
      </h2>

      <p style="margin:0 0 28px;font-size:17px;line-height:1.7;color:${BRAND.muted}">
        A new facility visit request has been submitted. The details are below:
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8F7FF;border-radius:14px;padding:10px 18px">
        ${detailRow("♙", "Name", request.name)}
        ${detailRow("✉", "Email", request.email, true)}
        ${detailRow("☎", "Phone", request.phone)}
        ${detailRow("▦", "Organization", request.organization || "Not provided")}
        ${detailRow("▣", "Visit date", request.visitDate)}
        ${detailRow("◷", "Visit time", request.visitTime)}
        ${detailRow("▤", "Purpose", request.purpose)}
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:32px">
        <tr>
          <td width="5" style="background:${BRAND.purple};border-radius:4px"></td>
          <td style="padding:8px 0 8px 18px;font-size:15px;line-height:1.8;color:${BRAND.muted}">
            Please review this request in the admin panel.
          </td>
        </tr>
      </table>
    `,
  }),
});

module.exports = {
  visitorAcknowledgementTemplate,
  adminVisitNotificationTemplate,
};
