const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

const visitorAcknowledgementTemplate = (visit) => {
  const name = escapeHtml(visit.visitorName);
  const date = escapeHtml(visit.date);
  const time = escapeHtml(visit.startTime);
  const company = escapeHtml(visit.company || "Not provided");
  const purpose = escapeHtml(visit.purpose);

  return {
    subject: "We received your facility visit request | Colo71",
    text: `Hello ${visit.visitorName},

We have received your facility visit request.

Company: ${visit.company || "Not provided"}
Requested date: ${visit.date}
Requested time: ${visit.startTime}
Purpose: ${visit.purpose}

Your visit has not yet been confirmed. Our team will review your request and send you a separate confirmation.

Thank you,
Colo71 Team`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.7">
        <div style="background:#101827;padding:24px;color:#ffffff">
          <h2 style="margin:0">Colo71</h2>
          <p style="margin:6px 0 0;color:#d1d5db">Facility Visit Scheduler</p>
        </div>

        <div style="padding:28px 24px;border:1px solid #e5e7eb">
          <h2 style="margin-top:0">We've received your request</h2>
          <p>Hello ${name},</p>
          <p>Thank you for requesting a visit to Colo71. Your request has been received and is awaiting review by our team.</p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin:24px 0">
            <h3 style="margin-top:0">Request details</h3>
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>Requested date:</strong> ${date}</p>
            <p><strong>Requested time:</strong> ${time}</p>
            <p><strong>Purpose:</strong> ${purpose}</p>
          </div>

          <p><strong>This is not a visit confirmation.</strong> We will send you a separate email once your visit has been reviewed and confirmed.</p>

          <p>Thank you,<br/>Colo71 Team</p>
        </div>
      </div>
    `,
  };
};

const adminVisitNotificationTemplate = (visit) => {
  const name = escapeHtml(visit.visitorName);
  const email = escapeHtml(visit.email);
  const phone = escapeHtml(visit.phone || "Not provided");
  const company = escapeHtml(visit.company || "Not provided");
  const date = escapeHtml(visit.date);
  const time = escapeHtml(visit.startTime);
  const purpose = escapeHtml(visit.purpose);
  const visitors = escapeHtml(visit.visitors ?? 1);

  return {
    subject: `New facility visit request: ${visit.visitorName}`,
    text: `A new facility visit request has been submitted.

Visitor: ${visit.visitorName}
Email: ${visit.email}
Phone: ${visit.phone || "Not provided"}
Company: ${visit.company || "Not provided"}
Date: ${visit.date}
Time: ${visit.startTime}
Visitors: ${visit.visitors ?? 1}
Purpose: ${visit.purpose}

Please review the request in the admin panel.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.7">
        <div style="background:#101827;padding:24px;color:#ffffff">
          <h2 style="margin:0">New Facility Visit Request</h2>
          <p style="margin:6px 0 0;color:#d1d5db">Colo71 Admin Notification</p>
        </div>

        <div style="padding:24px;border:1px solid #e5e7eb">
          <p>A visitor has submitted a new facility visit request.</p>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Requested date:</strong> ${date}</p>
          <p><strong>Requested time:</strong> ${time}</p>
          <p><strong>Number of visitors:</strong> ${visitors}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>

          <p>Please review this request in the admin panel.</p>
        </div>
      </div>
    `,
  };
};

module.exports = {
  visitorAcknowledgementTemplate,
  adminVisitNotificationTemplate,
};
