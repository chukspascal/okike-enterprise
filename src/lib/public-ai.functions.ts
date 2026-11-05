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

    // ── AI call ───────────────────────────────────────────────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    const system =
      data.system ??
      `You are OKIKE AI — the official assistant for OKIKE Enterprises (an institution that births other institutions, operating across 3 branches: 01 Startups via OKIKE Ventures, 02 Businesses via OKIKE Studio at https://studio.okikeenterprises.com, and 03 Students via OKIKE Academy).

Your role is to:
1. Welcome visitors warmly and guide them to the right OKIKE branch.
2. Explain OKIKE's 3 pillars:
   - 01 / Startups (OKIKE Ventures & Labs): Co-architecting early-stage startups, MVPs, and AI tools.
   - 02 / Businesses (OKIKE Studio — https://studio.okikeenterprises.com): Brand identity, web platforms, mobile apps, and custom software. Direct client project inquiries to https://studio.okikeenterprises.com/enquiry.
   - 03 / Students (OKIKE Academy — /learn & /enroll): Fullstack development, UI/UX design, Python, cybersecurity, data analysis, and the interactive student portal (/dashboard).
3. Answer questions about Studio packages, startup incubation, and Academy cohorts.
4. Promote the upcoming Computing Synergy Summit Bootcamp (August 1, 2026):
   - Offered tracks: Frontend/Backend Web Development, UI/UX Design, Cyber Security, Python/Data Science, and Mobile Development.
   - Admission is FREE for CS/IT department students (Computer Science, Information Technology, Software Engineering, Cyber Security). During registration, they must provide a valid University Registration Number containing 'CSC' (case-insensitive). Each registration number can only be used once.
   - Other students or non-students pay a fee of ₦5,000 (secured via Korapay).
   - Students can register for multiple tracks if they wish to learn more than one subject.
   - Dashboard features include structured syllabus modules, roadmap milestones, live night sessions, downloadable slide decks/guides, and quizzes/assignments.
5. Keep responses conversational and concise (1-3 short paragraphs).

Guide business/startup clients to https://studio.okikeenterprises.com and students to /learn, /bootcamp, or /enroll.`;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://okike.ai",
          "X-Title": "OKIKE Public AI Assistant",
        },
        body: JSON.stringify({
          model: data.model || "openai/gpt-4o-mini",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });

      if (res.status === 429)
        return { ok: false as const, error: "Rate limit reached. Try again in a moment." };
      if (res.status === 402)
        return {
          ok: false as const,
          error: "AI credits exhausted. Add credits in OpenRouter settings.",
        };
      if (!res.ok) {
        const t = await res.text();
        return {
          ok: false as const,
          error: `AI request failed (${res.status}): ${t.slice(0, 200)}`,
        };
      }
      const json = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, text };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "AI request failed.";
      return { ok: false as const, error: errorMessage };
    }
  });
