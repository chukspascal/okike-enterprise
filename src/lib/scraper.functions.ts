import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Structured Log Entry type for real telemetry
export type LogEntry = {
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
};

// Input schemas
const TriggerScraperInput = z.object({
  region: z.string().optional(),
  country: z.string().optional(),
  locationQuery: z.string().optional(),
  objective: z.string().optional(),
  depth: z.enum(["quick", "standard", "deep"]).optional(),
  source: z.string().optional(),
});

const UpdateIssueInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "reviewed", "solved", "ignored"]),
  solution_notes: z.string().optional(),
  market_value_score: z.number().min(0).max(100).optional(),
  feedback_score: z.number().optional(),
});

const DeleteIssueInput = z.object({
  id: z.string().uuid(),
});

const TrainAgentInput = z.object({
  category: z.string(),
  solution_notes: z.string(),
  issueId: z.string().uuid().optional(),
});

// 1. Trigger Scraper Agent Server Function
export const triggerScraperAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TriggerScraperInput.parse(d))
  .handler(async ({ data, context }) => {
    const { runScraperCore, ensureAdmin } = await import("@/lib/scraper.server");
    await ensureAdmin(context.userId);

    const logs: LogEntry[] = [];
    const result = await runScraperCore(logs, data);

    return {
      ...result,
      logs,
    };
  });

// 2. Update Opportunity Blueprint Server Function
export const updateScrapedIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateIssueInput.parse(d))
  .handler(async ({ data, context }) => {
    const { ensureAdmin } = await import("@/lib/scraper.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureAdmin(context.userId);

    const updatePayload: Record<string, any> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.solution_notes !== undefined) updatePayload.solution_notes = data.solution_notes;
    if (data.market_value_score !== undefined) updatePayload.market_value_score = data.market_value_score;
    if (data.feedback_score !== undefined) updatePayload.feedback_score = data.feedback_score;

    const { error } = await (supabaseAdmin as any)
      .from("scraped_issues")
      .update(updatePayload)
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 3. Discard Opportunity Server Function
export const deleteScrapedIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteIssueInput.parse(d))
  .handler(async ({ data, context }) => {
    const { ensureAdmin } = await import("@/lib/scraper.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureAdmin(context.userId);

    const { error } = await (supabaseAdmin as any)
      .from("scraped_issues")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 4. Train Neural Agent Memory Server Function
export const trainAgentMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TrainAgentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { ensureAdmin } = await import("@/lib/scraper.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureAdmin(context.userId);

    const { error } = await (supabaseAdmin as any)
      .from("agent_learning_memory")
      .insert({
        pattern_category: data.category,
        successful_blueprint_summary: data.solution_notes,
        confidence_weight: 1.0,
        trained_by_user_id: context.userId,
      });

    if (error) throw new Error(error.message);

    if (data.issueId) {
      await (supabaseAdmin as any)
        .from("scraped_issues")
        .update({ feedback_score: 1, updated_at: new Date().toISOString() })
        .eq("id", data.issueId);
    }

    return { ok: true };
  });
