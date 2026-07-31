import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().nullable().optional(),
  name: z.string().optional(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
});

type Project = {
  id: string;
  title: string;
  package_name: string | null;
  stage: string;
  created_at: string;
};

type Milestone = {
  id: string;
  project_id: string;
  name: string;
  status: string;
};

type Update = {
  id: string;
  project_id: string;
  message: string;
  created_at: string;
};

type ProjectData = {
  projects: Project[];
  milestones: Milestone[];
  updates: Update[];
};

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(20),
        system: z.string().max(2000).optional(),
        model: z.string().optional(),
        projectData: z.any().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    let projectContext = "";
    if (data.projectData) {
      const { projects, milestones, updates } = data.projectData as ProjectData;

      if (projects.length > 0) {
        projectContext = "\n\nUSER'S CURRENT PROJECT DATA:\n";

        for (const project of projects) {
          const projectMilestones = milestones.filter((m) => m.project_id === project.id);
          const projectUpdates = updates.filter((u) => u.project_id === project.id);

          projectContext += `\nPROJECT: ${project.title}\n`;
          projectContext += `- Stage: ${project.stage}\n`;
          if (project.package_name) projectContext += `- Package: ${project.package_name}\n`;

          if (projectMilestones.length > 0) {
            projectContext += "- Milestones:\n";
            for (const m of projectMilestones) {
              projectContext += `  • ${m.name}: ${m.status}\n`;
            }
          }

          if (projectUpdates.length > 0) {
            projectContext += "- Latest updates:\n";
            for (const u of projectUpdates.slice(0, 3)) {
              projectContext += `  • ${u.message} (${new Date(u.created_at).toLocaleString()})\n`;
            }
          }
        }
      }
    }

    let lmsContext = "";
    try {
      const userEmail = context.claims?.email;
      if (userEmail) {
        const { data: regs } = await (context.supabase as any)
          .from("bootcamp_registrations")
          .select("course")
          .ilike("email", userEmail);

        const tracks = (regs ?? []).map((r: any) => r.course).filter(Boolean);
        if (tracks.length > 0) {
          const { data: courses } = await (context.supabase as any)
            .from("courses")
            .select("title, lessons, milestones")
            .in("track", tracks);

          if (courses && courses.length > 0) {
            lmsContext = "\n\nSTUDENT ACADEMY SYLLABUS & ROADMAP:\n";
            for (const course of courses) {
              lmsContext += `\nCOURSE: ${course.title}\n`;
              if (Array.isArray(course.lessons) && course.lessons.length > 0) {
                lmsContext += `- Lessons:\n`;
                for (const lesson of course.lessons) {
                  lmsContext += `  • ${lesson}\n`;
                }
              }
              if (Array.isArray(course.milestones) && course.milestones.length > 0) {
                lmsContext += `- Milestones:\n`;
                for (const m of course.milestones) {
                  lmsContext += `  • ${(m as any).title || m}\n`;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load RAG syllabus context for AI assistant", err);
    }

    let systemPrompt =
        data.system ||
        `You are OKIKE AI, the intelligent assistant for OKIKE Enterprise. 
OKIKE is a Nigerian software studio & tech academy founded in 2023. We build world-class digital products and train the next generation of African engineers.
The founder is Chukwuma Pascal Chukwuemeka, hailing from Igbo Eze North LGA, Enugu State, Nigeria.

You can help users navigate their projects, understand their syllabus, and draft new project scopes or register for courses using the tools provided.
Always be polite, encouraging, and professional. You have access to real-time data about the user's projects and syllabus.
`;
      systemPrompt += projectContext + lmsContext;

      const tools = [
        {
          type: "function",
          function: {
            name: "draft_project",
            description: "Draft a new project for the user.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                package_name: { type: "string" },
              },
              required: ["title", "description", "package_name"],
            }
          }
        },
        {
          type: "function",
          function: {
            name: "register_course",
            description: "Draft a bootcamp registration for the user.",
            parameters: {
              type: "object",
              properties: {
                course_id: { type: "string" },
              },
              required: ["course_id"],
            }
          }
        }
      ];

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://okike-enterprise.com",
          "X-Title": "OKIKE Dashboard",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model || "openai/gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...data.messages],
          tools,
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
      const message = json?.choices?.[0]?.message;
      
      if (message?.tool_calls) {
        return { ok: true as const, text: message.content || "", tool_calls: message.tool_calls, message: message };
      }
      
      const text: string = message?.content ?? "";
      return { ok: true as const, text, message };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "AI request failed.";
      return { ok: false as const, error: errorMessage };
    }
  });

// ─── Feature 2: AI Project Creation Assistant ────────────────────────────────

export type PackageSummary = {
  id: string;
  name: string;
  base: number | null;
  timeline: string;
};

export type AddonSummary = {
  id: string;
  label: string;
  price: number;
};

export type AskProjectAssistantInput = {
  description: string;        // 20–2000 chars
  packages: PackageSummary[]; // [{ id, name, base, timeline }]
  addons: AddonSummary[];     // [{ id, label, price }]
  timelineOptions: string[];  // e.g. ["rush", "standard", "flexible"]
};

export type ProjectRecommendation = {
  pkg: "starter" | "business" | "custom";
  scopeGoal: string;
  scopePages: string;
  scopeBrand: string;
  addons: string[];            // array of addon ids
  timeline: string;            // one of the timeline option ids
  needs_clarification?: false;
};

export type ProjectClarification = {
  needs_clarification: true;
  clarification_question: string;
};

export type AskProjectAssistantResult =
  | { ok: true; recommendation: ProjectRecommendation }
  | { ok: true; recommendation: ProjectClarification }
  | { ok: false; error: string };

const AskProjectAssistantInputSchema = z.object({
  description: z.string().min(20).max(2000),
  packages: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        base: z.number().nullable(),
        timeline: z.string(),
      }),
    )
    .min(1),
  addons: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      price: z.number(),
    }),
  ),
  timelineOptions: z.array(z.string()),
});

export const askProjectAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AskProjectAssistantInputSchema.parse(d))
  .handler(async ({ data }): Promise<AskProjectAssistantResult> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "AI is not configured." };
    }

    const packageList = data.packages
      .map((p) => `- id: "${p.id}", name: "${p.name}", base price: ${p.base !== null ? `$${p.base}` : "custom quote"}, timeline: ${p.timeline}`)
      .join("\n");

    const addonList =
      data.addons.length > 0
        ? data.addons
          .map((a) => `- id: "${a.id}", label: "${a.label}", price: $${a.price}`)
          .join("\n")
        : "  (none available)";

    const timelineList = data.timelineOptions.join(", ");

    const systemPrompt = `You are an expert OKIKE project advisor. A prospective client will describe their project idea. Your job is to analyse the description and return a JSON object — nothing else, no markdown, no explanation.

Available packages:
${packageList}

Available add-ons:
${addonList}

Available timeline options: ${timelineList}

---

If you have enough information, return a JSON object matching this shape exactly:
{
  "pkg": "<one of the package ids above>",
  "scopeGoal": "<one concise sentence describing what the project is trying to achieve>",
  "scopePages": "<comma-separated list of main pages/sections, e.g. Home, About, Contact>",
  "scopeBrand": "<brief description of the desired look and feel>",
  "addons": ["<addon id>", ...],
  "timeline": "<one of the timeline option ids above>",
  "needs_clarification": false
}

If the description is too vague to make a confident recommendation, return:
{
  "needs_clarification": true,
  "clarification_question": "<a single, specific follow-up question that would allow you to make a recommendation>"
}

IMPORTANT: Return ONLY the JSON object. No markdown fences, no explanation text.`;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://okike.ai",
          "X-Title": "OKIKE AI Assistant",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: data.description },
          ],
        }),
      });

      if (res.status === 429)
        return { ok: false, error: "Rate limit reached. Try again in a moment." };
      if (res.status === 402)
        return { ok: false, error: "AI credits exhausted. Add credits in OpenRouter settings." };
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `AI request failed (${res.status}): ${t.slice(0, 200)}` };
      }

      const json = await res.json();
      const rawText: string = json?.choices?.[0]?.message?.content ?? "";

      if (!rawText) {
        return { ok: false, error: "AI returned an empty response." };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Try stripping markdown fences in case the model ignored instructions
        const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
        try {
          parsed = JSON.parse(stripped);
        } catch {
          return { ok: false, error: "AI response could not be parsed as JSON." };
        }
      }

      if (typeof parsed !== "object" || parsed === null) {
        return { ok: false, error: "AI returned an unexpected response shape." };
      }

      const obj = parsed as Record<string, unknown>;

      // Clarification branch
      if (obj.needs_clarification === true) {
        if (typeof obj.clarification_question !== "string" || !obj.clarification_question.trim()) {
          return { ok: false, error: "AI returned needs_clarification but no question." };
        }
        return {
          ok: true,
          recommendation: {
            needs_clarification: true,
            clarification_question: obj.clarification_question,
          },
        };
      }

      // Recommendation branch — validate all required fields
      const pkg = obj.pkg;
      if (pkg !== "starter" && pkg !== "business" && pkg !== "custom") {
        return { ok: false, error: `AI returned an invalid package id: ${String(pkg)}` };
      }

      if (typeof obj.scopeGoal !== "string" || !obj.scopeGoal.trim()) {
        return { ok: false, error: "AI recommendation is missing scopeGoal." };
      }
      if (typeof obj.scopePages !== "string" || !obj.scopePages.trim()) {
        return { ok: false, error: "AI recommendation is missing scopePages." };
      }
      if (typeof obj.scopeBrand !== "string" || !obj.scopeBrand.trim()) {
        return { ok: false, error: "AI recommendation is missing scopeBrand." };
      }
      if (!Array.isArray(obj.addons) || !obj.addons.every((a) => typeof a === "string")) {
        return { ok: false, error: "AI recommendation has an invalid addons field." };
      }
      if (typeof obj.timeline !== "string" || !obj.timeline.trim()) {
        return { ok: false, error: "AI recommendation is missing timeline." };
      }

      const recommendation: ProjectRecommendation = {
        pkg,
        scopeGoal: obj.scopeGoal,
        scopePages: obj.scopePages,
        scopeBrand: obj.scopeBrand,
        addons: obj.addons as string[],
        timeline: obj.timeline,
        needs_clarification: false,
      };

      return { ok: true, recommendation };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "AI request failed.";
      return { ok: false, error: errorMessage };
    }
  });


// ─── Feature 3: Proactive AI Insights ────────────────────────────────────────

export type Insight = {
  id: string;
  severity: "warning" | "info";
  title: string; // ≤60 chars
  message: string;
};

export type GenerateInsightsInput = {
  projects: {
    id: string;
    title: string;
    package_name: string | null;
    stage: string;
    created_at: string;
  }[];
  milestones: {
    id: string;
    project_id: string;
    name: string;
    status: string;
    updated_at?: string;
    created_at: string;
  }[];
  updates: {
    id: string;
    project_id: string;
    message: string;
    created_at: string;
  }[];
};

export type GenerateInsightsResult =
  | { ok: true; insights: Insight[] }
  | { ok: false; error: string };

/** Returns how many whole days ago a timestamp was from now (UTC). */
function daysAgo(isoString: string): number {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/** Truncates a string to maxLen characters (for title safety). */
function cap(str: string, maxLen = 60): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projects: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            package_name: z.string().nullable(),
            stage: z.string(),
            created_at: z.string(),
          }),
        ),
        milestones: z.array(
          z.object({
            id: z.string(),
            project_id: z.string(),
            name: z.string(),
            status: z.string(),
            updated_at: z.string().optional(),
            created_at: z.string(),
          }),
        ),
        updates: z.array(
          z.object({
            id: z.string(),
            project_id: z.string(),
            message: z.string(),
            created_at: z.string(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<GenerateInsightsResult> => {
    const { projects, milestones } = data;
    const insights: Insight[] = [];

    // ── Rule 1: Stalled milestones ──────────────────────────────────────────
    for (const m of milestones) {
      if (m.status === "active") {
        const ref = m.updated_at ?? m.created_at;
        const days = daysAgo(ref);
        if (days > 7) {
          insights.push({
            id: `stalled-${m.id}`,
            severity: "warning",
            title: cap(`Milestone stalled: ${m.name}`),
            message: `${days} days without progress on this milestone`,
          });
        }
      }
    }

    // ── Rule 2: Completion-ready projects ───────────────────────────────────
    for (const p of projects) {
      if (p.stage === "in_progress") {
        const projectMilestones = milestones.filter((m) => m.project_id === p.id);
        const allDone =
          projectMilestones.length > 0 && projectMilestones.every((m) => m.status === "done");
        if (allDone) {
          insights.push({
            id: `complete-ready-${p.id}`,
            severity: "info",
            title: cap(`Ready to complete: ${p.title}`),
            message: "All milestones done — notify admin for sign-off",
          });
        }
      }
    }

    // ── Rule 3: Cross-project pattern ───────────────────────────────────────
    if (projects.length >= 2) {
      const completedProjects = projects.filter((p) => p.stage === "completed");
      if (completedProjects.length >= 1) {
        const n = completedProjects.length;

        // Find most common package_name among completed projects
        // If tied, pick first alphabetically; if all null, use "Custom"
        const packageCounts: Record<string, number> = {};
        for (const p of completedProjects) {
          const pkg = p.package_name ?? "Custom";
          packageCounts[pkg] = (packageCounts[pkg] ?? 0) + 1;
        }
        const maxCount = Math.max(...Object.values(packageCounts));
        const mostCommonPackage =
          Object.entries(packageCounts)
            .filter(([, count]) => count === maxCount)
            .map(([name]) => name)
            .sort()[0] ?? "Custom";

        insights.push({
          id: "cross-project-pattern",
          severity: "info",
          title: cap(`${n} project${n === 1 ? "" : "s"} completed`),
          message: `Most common package: ${mostCommonPackage}`,
        });
      }
    }

    // ── Optional LLM summary ────────────────────────────────────────────────
    const hasActiveProject = projects.some(
      (p) => p.stage === "in_progress" || p.stage === "accepted",
    );

    if (hasActiveProject) {
      try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (apiKey) {
          const activeProjects = projects.filter(
            (p) => p.stage === "in_progress" || p.stage === "accepted",
          );
          const projectSummary = activeProjects
            .map((p) => {
              const ms = milestones.filter((m) => m.project_id === p.id);
              const doneCount = ms.filter((m) => m.status === "done").length;
              return `"${p.title}" (${p.stage}): ${doneCount}/${ms.length} milestones done`;
            })
            .join("; ");

          const prompt = `You are a project health advisor. Given this project summary: ${projectSummary}. Write ONE short sentence (max 15 words) of overall health advice or encouragement for the client. Reply with only that sentence, no quotes.`;

          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://okike.ai",
              "X-Title": "OKIKE AI Insights",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 60,
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const text: string = json?.choices?.[0]?.message?.content ?? "";
            if (text) {
              insights.push({
                id: "ai-summary",
                severity: "info",
                title: "AI summary",
                message: text.slice(0, 300),
              });
            }
          }
        }
      } catch {
        // LLM failure is non-fatal — return rule-based insights only
      }
    }

    return { ok: true, insights };
  });

const ReviewInputSchema = z.object({
  assignmentTitle: z.string(),
  instructions: z.string(),
  submissionText: z.string(),
  maxPoints: z.number(),
});

export const reviewSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) => ReviewInputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    const systemPrompt = `You are an expert AI teaching assistant grading a student's project/code submission.
Review the following assignment constraints and student work, evaluate their score out of ${data.maxPoints}, and write constructive feedback.

Assignment: ${data.assignmentTitle}
Instructions: ${data.instructions}
Student Submission: ${data.submissionText}

Your response must be in JSON format:
{
  "score": number, // integer score between 0 and ${data.maxPoints} based on quality of submission
  "feedback": "string" // concise, professional review and suggestions for improvement (1-3 paragraphs)
}`;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://okike.ai",
          "X-Title": "OKIKE Submission Reviewer",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false as const, error: `AI request failed: ${text.slice(0, 200)}` };
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content);
      
      return {
        ok: true as const,
        score: typeof parsed.score === "number" ? parsed.score : Math.round(data.maxPoints * 0.8),
        feedback: parsed.feedback || "Good effort on the submission."
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI review failed.";
      return { ok: false as const, error: msg };
    }
  });

export const getAiConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_conversations")
      .select("role, content")
      .eq("user_id", context.claims!.sub)
      .order("created_at", { ascending: true });
    
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, messages: data };
  });

export const saveAiMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_conversations")
      .insert({
        user_id: context.claims!.sub,
        role: data.role,
        content: data.content
      });
    
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
