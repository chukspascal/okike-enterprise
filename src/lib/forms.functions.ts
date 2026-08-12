import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getBootcampCoursePrice } from "@/lib/utils";
import { sendPushNotification } from "@/lib/push.server";
import {
  sendEmail,
  welcomeEmail,
  inquiryAdminEmail,
  inquiryClientEmail,
  contactAdminEmail,
  contactClientEmail,
  enrollmentAdminEmail,
  enrollmentClientEmail,
  passwordChangedEmail,
  directMessageEmail,
  sendBatchEmails,
} from "@/lib/email";

// ─── Project inquiry ──────────────────────────────────────────────────────────

const inquirySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  project_type: z.string().min(1).max(80),
  budget: z.string().max(80).optional().or(z.literal("")),
  timeline: z.string().max(80).optional().or(z.literal("")),
  details: z.string().min(10).max(4000),
  client_user_id: z.string().uuid(),
  package_name: z.string().optional().or(z.literal("")),
  total: z.number().optional().nullable(),
  deposit: z.number().optional().nullable(),
  currency: z.string().optional().or(z.literal("")),
  file_url: z.string().optional().or(z.literal("")),
});

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((data) => inquirySchema.parse(data))
  .handler(async ({ data }) => {
    const insertPayload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      project_type: data.project_type,
      budget: data.budget || null,
      timeline: data.timeline || null,
      details: data.details,
      client_user_id: data.client_user_id,
    };

    if (data.file_url) {
      insertPayload.file_url = data.file_url;
    }

    let { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("project_inquiries")
      .insert(insertPayload)
      .select("id")
      .single();

    // Self-healing: if file_url column does not exist in the database, retry without it
    if (inquiryError && inquiryError.message.includes("column \"file_url\" of relation \"project_inquiries\" does not exist")) {
      delete insertPayload.file_url;
      const retryResult = await supabaseAdmin
        .from("project_inquiries")
        .insert(insertPayload)
        .select("id")
        .single();
      inquiry = retryResult.data;
      inquiryError = retryResult.error;
    }

    if (inquiryError) return { ok: false as const, error: inquiryError.message };
    if (!inquiry) return { ok: false as const, error: "Failed to create inquiry record." };

    const { data: project, error: projectError } = await supabaseAdmin
      .from("client_projects")
      .insert({
        client_user_id: data.client_user_id,
        client_email: data.email,
        inquiry_id: inquiry.id,
        title: data.package_name || "Custom Project",
        package_name: data.package_name || null,
        total: data.total || null,
        deposit: data.deposit || null,
        currency: data.currency || "NGN",
        stage: "submitted",
      })
      .select("*")
      .single();

    if (projectError) return { ok: false as const, error: projectError.message };
    console.log("Created client project:", project);

    await Promise.allSettled([
      sendEmail(inquiryAdminEmail({
        name: data.name, email: data.email, phone: data.phone,
        company: data.company, project_type: data.project_type,
        budget: data.budget, timeline: data.timeline, details: data.details,
        package_name: data.package_name, total: data.total,
      })),
      sendEmail({ ...inquiryClientEmail({ name: data.name, project_type: data.project_type }), to: data.email }),
    ]);

    return { ok: true as const };
  });

// ─── Enrollment ───────────────────────────────────────────────────────────────

const enrollSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  course: z.string().max(120).optional().or(z.literal("")),
  experience_level: z.string().min(1).max(40),
  goals: z.string().min(10).max(2000),
});

export const submitEnrollment = createServerFn({ method: "POST" })
  .inputValidator((data) => enrollSchema.parse(data))
  .handler(async ({ data }) => {
    const consolidatedGoals = data.course
      ? `[Course of Interest: ${data.course}]\n\n${data.goals}`
      : data.goals;

    const { error } = await supabaseAdmin.from("course_enrollments").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      experience_level: data.experience_level,
      goals: consolidatedGoals,
    });
    if (error) return { ok: false as const, error: "Could not submit. Please try again." };

    await Promise.allSettled([
      sendEmail(enrollmentAdminEmail({
        name: data.name,
        email: data.email,
        phone: data.phone,
        course: data.course,
        experience_level: data.experience_level,
        goals: data.goals,
      })),
      sendEmail({ ...enrollmentClientEmail({ name: data.name, course: data.course }), to: data.email }),
    ]);

    return { ok: true as const };
  });

// ─── Contact ──────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  message: z.string().min(5).max(4000),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((data) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      message: data.message,
    });
    if (error) return { ok: false as const, error: "Could not submit. Please try again." };

    await Promise.allSettled([
      sendEmail(contactAdminEmail({ name: data.name, email: data.email, message: data.message })),
      sendEmail({ ...contactClientEmail({ name: data.name }), to: data.email }),
    ]);

    return { ok: true as const };
  });

// ─── Welcome email ────────────────────────────────────────────────────────────

const welcomeSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
});

export const sendWelcomeEmailFn = createServerFn({ method: "POST" })
  .inputValidator((data) => welcomeSchema.parse(data))
  .handler(async ({ data }) => {
    await sendEmail(welcomeEmail({ name: data.name, email: data.email }));
    return { ok: true as const };
  });

// ─── Bootcamp registration ────────────────────────────────────────────────────

const bootcampSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(40),
  department: z.string().min(1).max(120),
  level: z.string().min(1).max(40),
  is_department_student: z.boolean(),
  course: z.string().min(1).max(200),
  reg_no: z.string().optional().nullable(),
});

export const submitBootcampRegistration = createServerFn({ method: "POST" })
  .inputValidator((data) => bootcampSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.is_department_student) {
      if (!data.reg_no || !data.reg_no.toLowerCase().includes("csc")) {
        return { ok: false as const, error: "Invalid registration number. Department students must provide a valid registration number containing 'CSC'." };
      }

      // Check for duplicate registration number
      const { data: existingReg } = await supabaseAdmin
        .from("bootcamp_registrations" as never)
        .select("id")
        .eq("reg_no", data.reg_no.trim())
        .maybeSingle();

      if (existingReg) {
        return { ok: false as const, error: "This registration number has already been used for registration." };
      }
    }

    const reference = "bootcamp_" + Math.random().toString(36).slice(2, 15) + "_" + Date.now();
    const coursePrice = getBootcampCoursePrice(data.course);
    const { error } = await supabaseAdmin
      .from("bootcamp_registrations" as never)
      .insert({
        name: data.name,
        email: data.email.toLowerCase().trim(),
        phone: data.phone,
        department: data.department,
        level: data.level,
        course: data.course,
        is_department_student: data.is_department_student,
        reg_no: data.reg_no ? data.reg_no.trim() : null,
        payment_status: data.is_department_student ? "free" : "pending",
        payment_reference: data.is_department_student ? null : reference,
        verification_status: data.is_department_student ? "pending" : "approved",
      } as never);

    if (error) {
      console.error("bootcamp registration error:", error);
      return { ok: false as const, error: "Could not complete registration. Please try again." };
    }

    // Send confirmation to registrant
    const confirmHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Summit Registration Confirmed</title></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#111">
<tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;border-top:4px solid #eab308;">
<tr><td align="center" style="padding:32px 40px 20px;"><a href="https://okikeenterprises.com"><img src="https://res.cloudinary.com/djzsrfc6h/image/upload/v1781531660/Asset_40_q7oeri.png" alt="OKIKE" width="120" style="display:block;border:0;"/></a></td></tr>
<tr><td style="padding:0 40px;"><div style="height:2px;background:#eab308;"></div></td></tr>
<tr><td style="padding:36px 40px 24px;text-align:center;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#eab308;margin:0 0 10px;">Registration Received</p>
<h1 style="font-size:32px;font-weight:900;color:#fff;margin:0 0 14px;line-height:1.1;">You're registered, <span style="color:#eab308;">${data.name.split(" ")[0]}!</span></h1>
<p style="font-size:15px;color:#888;margin:0 0 0;line-height:1.7;">Your registration for the <strong style="color:#fff;">Computing Synergy Summit</strong> on <strong style="color:#fff;">1st August 2026</strong> has been received.</p>
</td></tr>
<tr><td style="padding:8px 40px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border-left:4px solid #eab308;">
<tr><td style="padding:18px 22px;">
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 12px;">Your registration details:</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Name:</strong> ${data.name}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Department:</strong> ${data.department}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Level:</strong> ${data.level}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Course:</strong> ${data.course}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Admission:</strong> ${data.is_department_student ? "Free (CS/IT Student)" : `₦${coursePrice.toLocaleString()} — payment required`}</p>
</td></tr>
</table>
</td></tr>
${!data.is_department_student ? `<tr><td style="padding:0 40px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1200;border-left:4px solid #eab308;">
<tr><td style="padding:16px 22px;">
<p style="font-size:13px;font-weight:700;color:#eab308;margin:0 0 6px;">Payment required</p>
<p style="font-size:13px;color:#999;margin:0;line-height:1.6;">Since you're not in the CS/IT department, a payment of <strong style="color:#fff;">₦${coursePrice.toLocaleString()}</strong> is required to confirm your ticket. If you didn't pay during checkout, please verify with our support.</p>
</td></tr>
</table>
</td></tr>` : ""}
<tr><td style="padding:8px 40px 36px;text-align:center;">
<p style="font-size:13px;color:#555;margin:0;">Questions? <a href="mailto:support@okikeenterprises.com" style="color:#eab308;text-decoration:none;">support@okikeenterprises.com</a></p>
</td></tr>
<tr><td style="padding:16px 40px 28px;border-top:1px solid #1a1a1a;text-align:center;">
<p style="font-size:12px;color:#444;margin:0;">&copy; ${new Date().getFullYear()} OKIKE Enterprises &nbsp;&middot;&nbsp; <a href="https://okikeenterprises.com" style="color:#eab308;text-decoration:none;">okikeenterprises.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    // Admin notification
    const adminHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-top:4px solid #eab308;">
<tr><td style="padding:28px 40px 16px;">
<span style="font-size:22px;font-weight:900;color:#111;">OKI</span><span style="font-size:22px;font-weight:900;color:#eab308;">KE</span>
</td></tr>
<tr><td style="padding:0 40px;"><div style="height:2px;background:#eab308;"></div></td></tr>
<tr><td style="padding:28px 40px;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#eab308;margin:0 0 8px;">New Registration</p>
<h1 style="font-size:24px;font-weight:800;color:#111;margin:0 0 16px;">Computing Synergy Summit</h1>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-left:4px solid #eab308;">
<tr><td style="padding:16px 20px;">
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Name:</strong> ${data.name}</p>
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Email:</strong> <a href="mailto:${data.email}" style="color:#eab308;">${data.email}</a></p>
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Phone:</strong> ${data.phone}</p>
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Department:</strong> ${data.department}</p>
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Level:</strong> ${data.level}</p>
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Dept student:</strong> ${data.is_department_student ? "✅ Yes (Free)" : `❌ No (₦${coursePrice.toLocaleString()} due)`}</p>
<p style="font-size:14px;color:#444;margin:4px 0;"><strong style="color:#111;">Payment Reference:</strong> ${reference}</p>
</td></tr>
</table>
${!data.is_department_student ? `<p style="font-size:13px;color:#e67e00;margin:16px 0 0;font-weight:600;">⚠️ This registrant requires a ₦${coursePrice.toLocaleString()} payment. Payment reference: ${reference}</p>` : ""}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    await Promise.allSettled([
      sendEmail({
        to: data.email,
        subject: "You're registered — Computing Synergy Summit",
        html: confirmHtml,
      }),
      sendEmail({
        to: "okikeenterprises@gmail.com",
        subject: `New summit registration — ${data.name} (${data.is_department_student ? "Free" : `₦${coursePrice.toLocaleString()} due`})`,
        html: adminHtml,
      }),
    ]);

    return { ok: true as const, reference: data.is_department_student ? null : reference };
  });

export const updateBootcampPaymentReference = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const newReference = "bootcamp_" + Math.random().toString(36).slice(2, 15) + "_" + Date.now();
    const { error } = await supabaseAdmin
      .from("bootcamp_registrations" as never)
      .update({ payment_reference: newReference } as never)
      .eq("id" as never, data.id as never);

    if (error) {
      return { ok: false as const, error: "Failed to update payment reference." };
    }
    return { ok: true as const, reference: newReference };
  });


// ─── Payment Verification ───────────────────────────────────────────────────

const verifyPaymentSchema = z.object({
  reference: z.string(),
});

export const verifyBootcampPayment = createServerFn({ method: "POST" })
  .inputValidator((data) => verifyPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    const secretKey = process.env.KORAPAY_SECRET_KEY;
    if (!secretKey) {
      return { ok: false as const, error: "Payment verification key is not configured." };
    }

    try {
      console.log(`[kora] Verifying payment for reference: ${data.reference}`);
      const res = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${data.reference}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[kora] API verification failed:", text);
        return { ok: false as const, error: "Failed to verify transaction with Kora." };
      }

      const body = await res.json();
      console.log("[kora] Response payload:", body);

      if (body.status && body.data && (body.data.status === "success" || body.data.status === "processing")) {
        // Update payment_status in database
        const { error } = await supabaseAdmin
          .from("bootcamp_registrations" as never)
          .update({ payment_status: "paid" } as never)
          .eq("payment_reference" as never, data.reference as never);

        if (error) {
          console.error("[kora] Database update failed:", error);
          return { ok: false as const, error: "Payment verified but database update failed." };
        }

        // Fetch registration details to send confirmation emails
        const { data: reg } = await supabaseAdmin
          .from("bootcamp_registrations" as never)
          .select("*")
          .eq("payment_reference" as never, data.reference as never)
          .maybeSingle();

        if (reg) {
          const paidHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Summit Admission Confirmed</title></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#111">
<tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;border-top:4px solid #eab308;">
<tr><td align="center" style="padding:32px 40px 20px;"><a href="https://okikeenterprises.com"><img src="https://res.cloudinary.com/djzsrfc6h/image/upload/v1781531660/Asset_40_q7oeri.png" alt="OKIKE" width="120" style="display:block;border:0;"/></a></td></tr>
<tr><td style="padding:0 40px;"><div style="height:2px;background:#eab308;"></div></td></tr>
<tr><td style="padding:36px 40px 24px;text-align:center;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#eab308;margin:0 0 10px;">Payment Confirmed</p>
<h1 style="font-size:32px;font-weight:900;color:#fff;margin:0 0 14px;line-height:1.1;">You're fully confirmed, <span style="color:#eab308;">${(reg as any).name.split(" ")[0]}!</span></h1>
<p style="font-size:15px;color:#888;margin:0 0 0;line-height:1.7;">We have received your payment of <strong style="color:#fff;">₦${getBootcampCoursePrice((reg as any).course).toLocaleString()}</strong> for the <strong style="color:#fff;">Computing Synergy Summit</strong> starting on <strong style="color:#fff;">1st August 2026</strong>. See you there!</p>
</td></tr>
<tr><td style="padding:8px 40px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border-left:4px solid #eab308;">
<tr><td style="padding:18px 22px;">
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 12px;">Your Summit Ticket:</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Ticket Reference:</strong> ${data.reference}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Status:</strong> Paid & Confirmed</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Date:</strong> 1st August 2026</p>
<p style="font-size:13px;margin:12px 0 0;"><a href="https://okike.ai/api/receipt/${(reg as any).id}" style="color:#eab308;text-decoration:underline;font-weight:bold;">Click here to view/print your ticket/receipt</a></p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:8px 40px 36px;text-align:center;">
<p style="font-size:13px;color:#555;margin:0;">Questions? <a href="mailto:support@okikeenterprises.com" style="color:#eab308;text-decoration:none;">support@okikeenterprises.com</a></p>
</td></tr>
<tr><td style="padding:16px 40px 28px;border-top:1px solid #1a1a1a;text-align:center;">
<p style="font-size:12px;color:#444;margin:0;">&copy; ${new Date().getFullYear()} OKIKE Enterprises &nbsp;&middot;&nbsp; <a href="https://okikeenterprises.com" style="color:#eab308;text-decoration:none;">okikeenterprises.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

          await Promise.allSettled([
            sendEmail({
              to: (reg as any).email,
              subject: "Payment Confirmed — Computing Synergy Summit",
              html: paidHtml,
            }),
            sendEmail({
              to: "okikeenterprises@gmail.com",
              subject: `Summit Payment Confirmed — ${(reg as any).name}`,
              html: `<p>Payment of ₦${getBootcampCoursePrice((reg as any).course).toLocaleString()} received for <strong>${(reg as any).name}</strong>. Reference: ${data.reference}</p>`,
            })
          ]);
        }

        return { ok: true as const };
      }

      return { ok: false as const, error: `Payment not successful. Status: ${body.data?.status || "unknown"}` };
    } catch (e: any) {
      console.error("[kora] Error verifying payment:", e);
      return { ok: false as const, error: e.message || "Failed to verify transaction." };
    }
  });

const verifyProjectSchema = z.object({
  projectId: z.string(),
  reference: z.string(),
});

export const verifyProjectDeposit = createServerFn({ method: "POST" })
  .inputValidator((data) => verifyProjectSchema.parse(data))
  .handler(async ({ data }) => {
    const secretKey = process.env.KORAPAY_SECRET_KEY;
    if (!secretKey) {
      return { ok: false as const, error: "Payment verification key is not configured." };
    }

    try {
      console.log(`[kora] Verifying project deposit for projectId: ${data.projectId}, reference: ${data.reference}`);
      const res = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${data.reference}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[kora] API verification failed:", text);
        return { ok: false as const, error: "Failed to verify project deposit transaction." };
      }

      const body = await res.json();
      console.log("[kora] Project payment response payload:", body);

      if (body.status && body.data && (body.data.status === "success" || body.data.status === "processing")) {
        // Fetch project to retrieve details
        const { data: project } = await supabaseAdmin
          .from("client_projects")
          .select("*")
          .eq("id", data.projectId)
          .maybeSingle();

        if (!project) {
          return { ok: false as const, error: "Project not found." };
        }

        // Update project stage to 'in_progress' and append admin notes
        // Trigger seed_milestones will automatically run
        const notes = (project.admin_notes || "") + `\n[System: Deposit payment reference ${data.reference} verified via Korapay.]`;
        const { error } = await supabaseAdmin
          .from("client_projects")
          .update({
            stage: "in_progress",
            admin_notes: notes,
          })
          .eq("id", data.projectId);

        if (error) {
          console.error("[kora] Database update failed:", error);
          return { ok: false as const, error: "Payment verified but database update failed." };
        }

        // Insert project update message
        await supabaseAdmin.from("project_updates").insert({
          project_id: data.projectId,
          message: `🎉 Deposit of ₦${Number(project.deposit || 0).toLocaleString()} received successfully. Project is now in progress!`,
          created_by: null, // system
        });

        // Send email to admin & client confirming payment
        await Promise.allSettled([
          sendEmail({
            to: project.client_email,
            subject: "Deposit Received — Project Activated!",
            html: `<p>We have successfully received your project deposit of <strong>₦${Number(project.deposit || 0).toLocaleString()}</strong>.</p><p>Your project <strong>"${project.title}"</strong> is now active and in progress. Check your dashboard to view milestones and track updates!</p>`,
          }),
          sendEmail({
            to: "okikeenterprises@gmail.com",
            subject: `Project Deposit Paid — ${project.title}`,
            html: `<p>Client ${project.client_email} paid deposit of ₦${Number(project.deposit || 0).toLocaleString()} for project "${project.title}". Reference: ${data.reference}</p>`,
          })
        ]);

        return { ok: true as const };
      }

      return { ok: false as const, error: `Payment not successful. Status: ${body.data?.status || "unknown"}` };
    } catch (e: any) {
      console.error("[kora] Error verifying project deposit:", e);
      return { ok: false as const, error: e.message || "Failed to verify transaction." };
    }
  });

const passwordChangedSchema = z.object({
  email: z.string().email(),
});

export const sendPasswordChangedEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => passwordChangedSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      await sendEmail({
        ...passwordChangedEmail(),
        to: data.email,
      });
      return { ok: true as const };
    } catch (err: any) {
      console.error("Failed to send password changed email", err);
      return { ok: false as const, error: err.message };
    }
  });

export const approveVerification = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string(), status: z.enum(["approved", "rejected"]) }).parse(d))
  .handler(async ({ data }) => {
    // 1. Update database
    const { data: reg, error } = await supabaseAdmin
      .from("bootcamp_registrations" as never)
      .update({ verification_status: data.status } as never)
      .eq("id" as never, data.id as never)
      .select("*")
      .single();

    if (error || !reg) {
      return { ok: false as const, error: "Failed to update verification status." };
    }

    // 2. If approved, send confirmation email
    if (data.status === "approved") {
      const appHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Summit Admission Confirmed</title></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#111">
<tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;border-top:4px solid #eab308;">
<tr><td align="center" style="padding:32px 40px 20px;"><a href="https://okikeenterprises.com"><img src="https://res.cloudinary.com/djzsrfc6h/image/upload/v1781531660/Asset_40_q7oeri.png" alt="OKIKE" width="120" style="display:block;border:0;"/></a></td></tr>
<tr><td style="padding:0 40px;"><div style="height:2px;background:#eab308;"></div></td></tr>
<tr><td style="padding:36px 40px 24px;text-align:center;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#eab308;margin:0 0 10px;">Registration Approved</p>
<h1 style="font-size:32px;font-weight:900;color:#fff;margin:0 0 14px;line-height:1.1;">Your Registration is Approved, <span style="color:#eab308;">${(reg as any).name.split(" ")[0]}!</span></h1>
<p style="font-size:15px;color:#888;margin:0 0 0;line-height:1.7;">Your free student admission for the <strong style="color:#fff;">Computing Synergy Summit</strong> starting on <strong style="color:#fff;">1st August 2026</strong> has been verified. See you there!</p>
</td></tr>
<tr><td style="padding:8px 40px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border-left:4px solid #eab308;">
<tr><td style="padding:18px 22px;">
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 12px;">Your Summit Ticket:</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Course Track:</strong> ${(reg as any).course || "General Track"}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><strong style="color:#fff;">Registration No:</strong> ${(reg as any).reg_no || "N/A"}</p>
<p style="font-size:13px;color:#bbb;margin:4px 0;"><a href="https://okike.ai/api/receipt/${(reg as any).id}" style="color:#eab308;text-decoration:underline;">Click here to view/print your ticket/receipt</a></p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:8px 40px 36px;text-align:center;">
<p style="font-size:13px;color:#555;margin:0;">Questions? <a href="mailto:support@okikeenterprises.com" style="color:#eab308;text-decoration:none;">support@okikeenterprises.com</a></p>
</td></tr>
<tr><td style="padding:16px 40px 28px;border-top:1px solid #1a1a1a;text-align:center;">
<p style="font-size:12px;color:#444;margin:0;">&copy; ${new Date().getFullYear()} OKIKE Enterprises &nbsp;&middot;&nbsp; <a href="https://okikeenterprises.com" style="color:#eab308;text-decoration:none;">okikeenterprises.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      await sendEmail({
        to: (reg as any).email,
        subject: "Admission Approved — Computing Synergy Summit",
        html: appHtml,
      });
    }

    return { ok: true as const };
  });

const directMessageSchema = z.object({
  studentEmail: z.string().email(),
  studentName: z.string().min(1),
  senderName: z.string().min(1),
  senderRole: z.string().optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export const sendDirectMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => directMessageSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      await sendEmail({
        ...directMessageEmail({
          studentName: data.studentName,
          senderName: data.senderName,
          senderRole: data.senderRole,
          subject: data.subject,
          message: data.message,
        }),
        to: data.studentEmail,
      });

      // Trigger Push Notification
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", data.studentEmail)
        .single();
        
      if (profile) {
        await sendPushNotification(
          profile.id,
          "New Support Reply",
          `OKIKE Support: ${data.message.substring(0, 50)}...`,
          "/dashboard?tab=messages"
        );
      }

      return { ok: true as const };
    } catch (err: any) {
      console.error("Failed to send direct message email", err);
      return { ok: false as const, error: err.message };
    }
  });

const bulkMessageSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
  })).min(1).max(100),
  senderName: z.string().min(1),
  senderRole: z.string().optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export const sendBulkMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => bulkMessageSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const payloads = data.recipients.map(recipient => ({
        ...directMessageEmail({
          studentName: recipient.name,
          senderName: data.senderName,
          senderRole: data.senderRole,
          subject: data.subject,
          message: data.message,
        }),
        to: recipient.email,
      }));

      const { failedCount, error } = await sendBatchEmails(payloads);
      
      if (failedCount === data.recipients.length && data.recipients.length > 0) {
        return { ok: false as const, error: error || "Failed to send to all recipients" };
      }

      return { ok: true as const, failedCount };
    } catch (err: any) {
      console.error("Failed to send bulk messages", err);
      return { ok: false as const, error: err.message };
    }
  });

