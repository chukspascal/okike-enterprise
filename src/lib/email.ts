const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "OKIKE <noreply@okikeenterprises.com>";
const ADMIN_EMAIL = "okikeenterprises@gmail.com"; // update to your preferred admin inbox

// Supports both raw HTML emails and Resend template-based emails
interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  template_id?: string;
  data?: Record<string, string>;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }

  const body: Record<string, unknown> = {
    from: FROM,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
  };

  if (payload.template_id) {
    body.template_id = payload.template_id;
    if (payload.data) body.data = payload.data;
  } else {
    body.html = payload.html;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Resend error (${res.status}):`, err);
  }
}

// ─── Base template ────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>OKIKE</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-top:4px solid #E0EB32;">
      <tr>
        <td style="padding:28px 40px 20px;">
          <a href="https://okikeenterprises.com" style="text-decoration:none;display:inline-block;">
            <img src="https://res.cloudinary.com/djzsrfc6h/image/upload/v1781531660/Asset_40_q7oeri.png" alt="OKIKE" width="120" height="auto" style="display:block;border:0;max-width:120px;" />
          </a>
          <br/>
          <span style="font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#999999;">Your Digital Ecosystem</span>
        </td>
      </tr>
      <tr><td style="padding:0 40px;"><div style="height:2px;background-color:#E0EB32;"></div></td></tr>
      <tr><td style="padding:32px 40px;">${content}</td></tr>
      <tr>
        <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="font-size:12px;color:#999999;margin:0;">&copy; ${year} OKIKE Enterprises &nbsp;&middot;&nbsp; <a href="https://okikeenterprises.com" style="color:#E0EB32;text-decoration:none;">okikeenterprises.com</a></p>
          <p style="font-size:11px;color:#bbbbbb;margin:6px 0 0;">You're receiving this because you interacted with OKIKE.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Reusable snippet helpers ─────────────────────────────────────────────────

function infoCard(rows: string[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border-left:4px solid #E0EB32;margin:20px 0;">
    <tr><td style="padding:16px 20px;">${rows.join("\n")}</td></tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `<p style="margin:4px 0;font-size:14px;color:#444444;"><strong style="color:#111111;">${label}:</strong> ${value}</p>`;
}

function ctaButton(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
    <tr><td style="background-color:#E0EB32;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:12px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#000000;text-decoration:none;">${text} &rarr;</a>
    </td></tr>
  </table>`;
}

function h1(text: string): string {
  return `<h1 style="font-size:28px;font-weight:800;color:#111111;margin:0 0 12px;line-height:1.15;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="font-size:15px;line-height:1.7;color:#555555;margin:0 0 14px;">${text}</p>`;
}

function featureRow(icon: string, title: string, desc: string): string {
  return `<tr>
    <td style="padding:10px 0;vertical-align:top;width:32px;">
      <div style="width:28px;height:28px;background-color:#E0EB32;display:inline-flex;align-items:center;justify-content:center;font-size:14px;">${icon}</div>
    </td>
    <td style="padding:10px 0 10px 12px;vertical-align:top;">
      <p style="font-size:14px;font-weight:700;color:#111111;margin:0 0 2px;">${title}</p>
      <p style="font-size:13px;color:#666666;margin:0;">${desc}</p>
    </td>
  </tr>`;
}

// ─── Email templates ──────────────────────────────────────────────────────────

export function welcomeEmail(data: { name: string; email: string }): EmailPayload {
  const firstName = data.name.split(" ")[0];
  const year = new Date().getFullYear();
  return {
    to: data.email,
    subject: `Welcome to OKIKE, ${firstName} 👋`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Welcome to OKIKE</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#111111">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0a0a0a;border-top:4px solid #E0EB32;">
      <tr>
        <td align="center" style="padding:36px 40px 24px;">
          <a href="https://okikeenterprises.com" style="text-decoration:none;display:inline-block;">
            <img src="https://res.cloudinary.com/djzsrfc6h/image/upload/v1781531660/Asset_40_q7oeri.png" alt="OKIKE" width="130" height="auto" style="display:block;border:0;" />
          </a>
        </td>
      </tr>
      <tr><td style="padding:0 40px;"><div style="height:2px;background-color:#E0EB32;"></div></td></tr>
      <tr>
        <td style="padding:40px 40px 24px;text-align:center;">
          <p style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#E0EB32;margin:0 0 12px;">Welcome</p>
          <h1 style="font-size:34px;font-weight:900;color:#ffffff;margin:0 0 16px;line-height:1.1;">Good to have you,<br/><span style="color:#E0EB32;">${firstName}.</span></h1>
          <p style="font-size:15px;line-height:1.7;color:#888888;margin:0;max-width:420px;display:inline-block;">Your OKIKE account is ready. You can now scope projects, track progress in real time, and work directly with our team.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 40px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;border-left:4px solid #E0EB32;">
            <tr><td style="padding:20px 24px;">
              <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#E0EB32;margin:0 0 16px;">Here's what you can do</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;"><tr>
                <td style="width:36px;vertical-align:top;"><div style="width:30px;height:30px;background-color:#E0EB32;text-align:center;line-height:30px;font-size:16px;">🚀</div></td>
                <td style="padding-left:14px;vertical-align:top;"><p style="font-size:14px;font-weight:700;color:#ffffff;margin:0 0 2px;">Start a project</p><p style="font-size:13px;color:#777777;margin:0;">Describe what you want to build and get a fixed-price proposal within 24 hours.</p></td>
              </tr></table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;"><tr>
                <td style="width:36px;vertical-align:top;"><div style="width:30px;height:30px;background-color:#E0EB32;text-align:center;line-height:30px;font-size:16px;">📊</div></td>
                <td style="padding-left:14px;vertical-align:top;"><p style="font-size:14px;font-weight:700;color:#ffffff;margin:0 0 2px;">Track your project</p><p style="font-size:13px;color:#777777;margin:0;">See milestones, updates, and your project stage in real time from your dashboard.</p></td>
              </tr></table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;"><tr>
                <td style="width:36px;vertical-align:top;"><div style="width:30px;height:30px;background-color:#E0EB32;text-align:center;line-height:30px;font-size:16px;">🤖</div></td>
                <td style="padding-left:14px;vertical-align:top;"><p style="font-size:14px;font-weight:700;color:#ffffff;margin:0 0 2px;">Ask OKIKE AI</p><p style="font-size:13px;color:#777777;margin:0;">Your AI assistant answers questions, summarises progress and suggests next steps.</p></td>
              </tr></table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td style="width:36px;vertical-align:top;"><div style="width:30px;height:30px;background-color:#E0EB32;text-align:center;line-height:30px;font-size:16px;">🎓</div></td>
                <td style="padding-left:14px;vertical-align:top;"><p style="font-size:14px;font-weight:700;color:#ffffff;margin:0 0 2px;">Explore the Academy</p><p style="font-size:13px;color:#777777;margin:0;">Learn fullstack development, UI/UX design, and more through our structured courses.</p></td>
              </tr></table>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:8px 40px 40px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background-color:#E0EB32;">
              <a href="https://okikeenterprises.com/dashboard" style="display:inline-block;padding:16px 40px;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#000000;text-decoration:none;">Go to Dashboard &rarr;</a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#555555;margin:20px 0 0;">Questions? <a href="mailto:support@okikeenterprises.com" style="color:#E0EB32;text-decoration:none;">support@okikeenterprises.com</a></p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 40px 32px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="font-size:12px;color:#444444;margin:0;">&copy; ${year} OKIKE Enterprises &nbsp;&middot;&nbsp; <a href="https://okikeenterprises.com" style="color:#E0EB32;text-decoration:none;">okikeenterprises.com</a></p>
          <p style="font-size:11px;color:#333333;margin:6px 0 0;">You're receiving this because you created an OKIKE account.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  };
}

export function inquiryAdminEmail(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  project_type: string;
  budget?: string;
  timeline?: string;
  details: string;
  package_name?: string;
  total?: number | null;
}): EmailPayload {
  const rows = [
    infoRow("Name", data.name),
    infoRow("Email", `<a href="mailto:${data.email}" style="color:#E0EB32;">${data.email}</a>`),
    data.phone ? infoRow("Phone", data.phone) : "",
    data.company ? infoRow("Company", data.company) : "",
    infoRow("Package", data.package_name || data.project_type),
    data.budget ? infoRow("Budget", data.budget) : "",
    data.total ? infoRow("Estimated total", `&#8358;${data.total.toLocaleString()}`) : "",
    data.timeline ? infoRow("Timeline", data.timeline) : "",
  ].filter(Boolean);

  return {
    to: ADMIN_EMAIL,
    subject: `New project inquiry — ${data.name} (${data.project_type})`,
    html: baseTemplate(`
      <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#E0EB32;margin:0 0 8px;">New Submission</p>
      ${h1("New Project Inquiry")}
      ${para("A new project brief has been submitted via the OKIKE website.")}
      ${infoCard(rows)}
      ${infoCard([`<p style="font-size:13px;font-weight:700;color:#111;margin:0 0 8px;">Project details:</p><p style="font-size:13px;color:#555;margin:0;white-space:pre-wrap;line-height:1.6;">${data.details}</p>`])}
      ${ctaButton("Review in Admin", "https://okikeenterprises.com/admin/inquiries")}
    `),
  };
}

export function inquiryClientEmail(data: {
  name: string;
  project_type: string;
}): EmailPayload {
  const firstName = data.name.split(" ")[0];
  return {
    to: data.name,
    subject: `We received your project brief — OKIKE`,
    html: baseTemplate(`
      ${h1(`We've got your brief, ${firstName}.`)}
      ${para(`Thanks for submitting your <strong style="color:#111;">${data.project_type}</strong> project to OKIKE. We've received everything and a member of our team will review it within <strong style="color:#111;">24 hours</strong>.`)}
      ${infoCard([
      `<p style="font-size:13px;font-weight:700;color:#111;margin:0 0 10px;">What happens next:</p>`,
      `<p style="font-size:13px;color:#555;margin:4px 0;">1 &mdash; We review your brief and confirm feasibility</p>`,
      `<p style="font-size:13px;color:#555;margin:4px 0;">2 &mdash; We send you a written proposal or follow-up questions</p>`,
      `<p style="font-size:13px;color:#555;margin:4px 0;">3 &mdash; Once agreed, you'll receive a deposit link to get started</p>`,
    ])}
      ${para("Track your project status anytime in your dashboard.")}
      ${ctaButton("View Dashboard", "https://okikeenterprises.com/dashboard")}
      ${para(`Questions? Reply to this email or reach us at <a href="mailto:support@okikeenterprises.com" style="color:#E0EB32;">support@okikeenterprises.com</a>`)}
    `),
  };
}

export function contactAdminEmail(data: {
  name: string;
  email: string;
  message: string;
}): EmailPayload {
  return {
    to: ADMIN_EMAIL,
    subject: `New contact message from ${data.name}`,
    html: baseTemplate(`
      <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#E0EB32;margin:0 0 8px;">Contact Form</p>
      ${h1("New Message")}
      ${infoCard([
      infoRow("Name", data.name),
      infoRow("Email", `<a href="mailto:${data.email}" style="color:#E0EB32;">${data.email}</a>`),
    ])}
      ${infoCard([`<p style="font-size:13px;font-weight:700;color:#111;margin:0 0 8px;">Message:</p><p style="font-size:13px;color:#555;margin:0;white-space:pre-wrap;line-height:1.6;">${data.message}</p>`])}
      ${ctaButton(`Reply to ${data.name}`, `mailto:${data.email}?subject=Re: Your message to OKIKE`)}
    `),
  };
}

export function contactClientEmail(data: { name: string }): EmailPayload {
  const firstName = data.name.split(" ")[0];
  return {
    to: data.name,
    subject: `We got your message — OKIKE`,
    html: baseTemplate(`
      ${h1(`Message received, ${firstName}.`)}
      ${para("Thanks for reaching out to OKIKE. We typically respond within <strong style=\"color:#111;\">24 hours</strong> on business days.")}
      ${para(`If your inquiry is urgent, reach us directly at <a href="mailto:support@okikeenterprises.com" style="color:#E0EB32;">support@okikeenterprises.com</a>.`)}
      ${ctaButton("Back to OKIKE", "https://okikeenterprises.com")}
    `),
  };
}

export function enrollmentAdminEmail(data: {
  name: string;
  email: string;
  phone?: string;
  course?: string;
  experience_level: string;
  goals: string;
}): EmailPayload {
  const rows = [
    infoRow("Name", data.name),
    infoRow("Email", `<a href="mailto:${data.email}" style="color:#E0EB32;">${data.email}</a>`),
    data.phone ? infoRow("Phone/WhatsApp", data.phone) : "",
    data.course ? infoRow("Course of Interest", data.course) : "",
    infoRow("Experience level", data.experience_level),
  ].filter(Boolean);

  return {
    to: ADMIN_EMAIL,
    subject: `New academy application — ${data.name} (${data.experience_level})`,
    html: baseTemplate(`
      <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#E0EB32;margin:0 0 8px;">Academy Application</p>
      ${h1("New Application")}
      ${infoCard(rows)}
      ${infoCard([`<p style="font-size:13px;font-weight:700;color:#111;margin:0 0 8px;">Why they want to join:</p><p style="font-size:13px;color:#555;margin:0;white-space:pre-wrap;line-height:1.6;">${data.goals}</p>`])}
      ${ctaButton(`Reply to Applicant`, `mailto:${data.email}?subject=Your OKIKE Academy Application`)}
    `),
  };
}

export function enrollmentClientEmail(data: { name: string; course?: string }): EmailPayload {
  const firstName = data.name.split(" ")[0];
  const courseStr = data.course ? ` for <strong style="color:#111;">${data.course}</strong>` : "";
  return {
    to: data.name,
    subject: `Application received — OKIKE Academy`,
    html: baseTemplate(`
      ${h1(`Application received, ${firstName}.`)}
      ${para(`Thank you for applying to the <strong style="color:#111;">OKIKE Academy</strong>${courseStr}. We review every application personally and will be in touch within <strong style="color:#111;">3&ndash;5 business days</strong>.`)}
      ${infoCard([
      `<p style="font-size:13px;font-weight:700;color:#111;margin:0 0 10px;">What to expect:</p>`,
      `<p style="font-size:13px;color:#555;margin:4px 0;">1 &mdash; Personal review of your application</p>`,
      `<p style="font-size:13px;color:#555;margin:4px 0;">2 &mdash; A short call or follow-up questions if needed</p>`,
      `<p style="font-size:13px;color:#555;margin:4px 0;">3 &mdash; Acceptance decision with next steps</p>`,
    ])}
      ${para("In the meantime, explore our curriculum and what our students have built.")}
      ${ctaButton("Explore the Academy", "https://okikeenterprises.com/learn")}
    `),
  };
}

export function passwordChangedEmail(): EmailPayload {
  return {
    to: "",
    subject: "Security Alert: Your OKIKE Password Was Updated",
    html: baseTemplate(`
      ${h1("Password Changed")}
      ${para("This email is to notify you that the password for your OKIKE account has been successfully updated.")}
      ${para("If you did not make this change, please contact the OKIKE Support team immediately at <a href=\"mailto:support@okikeenterprises.com\" style=\"color:#E0EB32;text-decoration:underline;\">support@okikeenterprises.com</a> to secure your account.")}
    `),
  };
}

export function directMessageEmail(data: {
  studentName: string;
  senderName: string;
  senderRole?: string;
  subject: string;
  message: string;
}): EmailPayload {
  const firstName = data.studentName.split(" ")[0] || "Student";
  const roleText = data.senderRole ? ` (${data.senderRole})` : "";
  
  // Convert newlines in message to <br/> tags for simple formatting
  const formattedMessage = data.message.replace(/\n/g, "<br/>");

  return {
    to: "",
    subject: data.subject,
    html: baseTemplate(`
      <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#E0EB32;margin:0 0 8px;">Direct Message</p>
      ${h1(data.subject)}
      ${para(`Hello ${firstName},`)}
      ${infoCard([
        `<p style="font-size:14px;color:#333;margin:0;line-height:1.6;">${formattedMessage}</p>`
      ])}
      ${para(`Best regards,<br/><strong style="color:#111;">${data.senderName}</strong>${roleText}`)}
      ${ctaButton("View Dashboard", "https://okikeenterprises.com/dashboard")}
    `),
  };
}
