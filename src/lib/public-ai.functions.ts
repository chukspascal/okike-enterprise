import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";

// ── In-memory rate limiter ──────────────────────────────────────────────────
// Limits each IP to MAX_REQUESTS within WINDOW_MS. Entries are lazily pruned.
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = ipHits.get(ip) ?? [];
  // Remove expired entries
  const recent = hits.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  return false;
}

// Prune stale IPs every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of ipHits) {
    const recent = hits.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, recent);
  }
}, 5 * 60_000);

// ── Schema ──────────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

export const askPublicAI = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(20),
        system: z.string().max(2000).optional(),
        model: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // ── Rate limit check ──────────────────────────────────────────────
    let clientIp = "unknown";
    try {
      const request = getRequest();
      clientIp =
        request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request?.headers?.get("x-real-ip") ??
        "unknown";
    } catch {
      // getRequest may throw outside server context during dev
    }

    if (isRateLimited(clientIp)) {
      return {
        ok: false as const,
        error: "You're sending messages too quickly. Please wait a moment.",
      };
    }

    // ── Shared OKIKE + Coach Ziri Knowledge System Prompt ─────────────
    const system =
      data.system ??
      `You are Coach Ziri (OKIKE Ecosystem AI) — the official AI intelligence assistant for OKIKE Enterprises (an institution that births other institutions, operating across 3 branches: 01 Startups via OKIKE Ventures & AI Labs, 02 Businesses via OKIKE Studio at https://studio.okikeenterprises.com, and 03 Students via OKIKE Academy).

Your role is to:
1. Welcome visitors warmly as Coach Ziri, the OKIKE Ecosystem AI, and guide them to the right OKIKE branch.
2. Explain OKIKE's 3 pillars and flagship AI products:
   - 01 / Startups (OKIKE Ventures & AI Labs): Co-architecting early-stage startups, rapid 2–3 week MVPs, and proprietary AI platforms including Coach Ziri (https://coach-ziri.okikeenterprises.com — OKIKE's executive AI productivity, voice coaching, calendar & inbox command center).
   - 02 / Businesses (OKIKE Studio — https://studio.okikeenterprises.com): Brand identity, web platforms, mobile apps, and custom software. Direct client project inquiries to https://studio.okikeenterprises.com/enquiry.
   - 03 / Students (OKIKE Academy — /learn & /enroll): Fullstack development, UI/UX design, Python, cybersecurity, data analysis, and the interactive student portal (/dashboard).
3. Answer questions about Studio packages, startup incubation, Coach Ziri (https://coach-ziri.okikeenterprises.com), and Academy cohorts.
4. Promote the upcoming Computing Synergy Summit Bootcamp (August 1, 2026):
   - Offered tracks: Frontend/Backend Web Development, UI/UX Design, Cyber Security, Python/Data Science, and Mobile Development.
   - Admission is FREE for CS/IT department students (Computer Science, Information Technology, Software Engineering, Cyber Security). During registration, they must provide a valid University Registration Number containing 'CSC' (case-insensitive). Each registration number can only be used once.
   - Other students or non-students pay a fee of ₦5,000 (secured via Korapay).
   - Students can register for multiple tracks if they wish to learn more than one subject.
   - Dashboard features include structured syllabus modules, roadmap milestones, live night sessions, downloadable slide decks/guides, and quizzes/assignments.
5. Keep responses conversational and concise (1-3 short paragraphs).

Guide business/startup clients to https://studio.okikeenterprises.com, executive productivity users to https://coach-ziri.okikeenterprises.com, and students to /learn, /bootcamp, or /enroll.`;

    const ziriBackendUrl =
      process.env.PYTHON_BACKEND_URL || "https://coach-4waf.onrender.com";
    const okikeKey = process.env.OKIKE_PLATFORM_API_KEY || "okike-live-secret-2026";
    const okikeUserId =
      process.env.OKIKE_OWNER_USER_ID || "3206f2b2-c05d-485c-9361-ee0946a7efb1";
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // Automatically notify Coach Ziri command center if visitor sends a high-intent business/startup lead message
    const lastUserMsg = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (
      /\b(hire|quote|pricing|build my|project|contact|email me|call me|whatsapp|consultation|partner)\b/i.test(
        lastUserMsg,
      ) &&
      lastUserMsg.length > 20
    ) {
      fetch(`${ziriBackendUrl}/v1/webhooks/platform-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Okike-Key": okikeKey,
          "X-Okike-User-Id": okikeUserId,
        },
        body: JSON.stringify({
          source_platform: "okikeenterprises.com",
          event_type: "website_ai_inquiry",
          title: `Main Site AI Inquiry: "${lastUserMsg.slice(0, 80)}"`,
          notes: `Visitor message on okikeenterprises.com: ${lastUserMsg}`,
          create_priority_task: false,
          priority: "medium",
        }),
      }).catch(() => {});
    }

    // 1. Primary: Google Gemini Flash (Shared Coach Ziri Brain + Full OKIKE Knowledge)
    if (geminiKey) {
      try {
        const contents = data.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
              generationConfig: { temperature: 0.4 },
            }),
          },
        );
        if (geminiRes.ok) {
          const gJson = await geminiRes.json();
          const gText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (gText) {
            return { ok: true as const, text: String(gText).trim() };
          }
        }
      } catch {
        // Fall through to OpenRouter / Render Engine
      }
    }

    // 2. Secondary: OpenRouter (with shared OKIKE + Coach Ziri system prompt)
    if (openRouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://okikeenterprises.com",
            "X-Title": "Coach Ziri · OKIKE Ecosystem AI",
          },
          body: JSON.stringify({
            model: data.model || "openai/gpt-4o-mini",
            messages: [{ role: "system", content: system }, ...data.messages],
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const text: string = json?.choices?.[0]?.message?.content ?? "";
          if (text) return { ok: true as const, text };
        }
      } catch {
        // Fall through to Coach Ziri Render Python Engine
      }
    }

    return { ok: false as const, error: "Unable to reach OKIKE AI engine." };
  });
