import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LogEntry = {
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
};

type RawObservation = {
  title: string;
  body: string;
  url: string;
  platform: string;
};

export async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export async function runScraperCore(
  logs: LogEntry[],
  options?: {
    region?: string;
    country?: string;
    locationQuery?: string;
    objective?: string;
    depth?: "quick" | "standard" | "deep";
    source?: string;
  }
): Promise<{ ok: boolean; insertedCount: number }> {
  let insertedCount = 0;
  const targetRegion = options?.region || "Global";
  const targetCountry = options?.country || "Global";
  const locQuery = options?.locationQuery || "";
  const depth = options?.depth || "standard";
  const objective = options?.objective || "developer_pain_points";
  const selectedSource = options?.source || "all";

  const maxAnalyze = depth === "quick" ? 4 : depth === "deep" ? 14 : 8;
  const perPage = depth === "quick" ? 8 : depth === "deep" ? 25 : 12;

  const addLog = (level: LogEntry["level"], message: string) => {
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    });
  };

  try {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      addLog("error", "AI configuration error: OPENROUTER_API_KEY is not defined in environment.");
      return { ok: false, insertedCount };
    }

    // 1. Query Real Neural Memory Exemplars from OKIKE team database
    addLog("info", "Loading past team feedback & neural exemplars from database...");
    let memoryPromptContext = "";
    try {
      const { data: memoryData } = await (supabaseAdmin as any)
        .from("agent_learning_memory")
        .select("pattern_category, successful_blueprint_summary")
        .order("created_at", { ascending: false })
        .limit(6);

      if (memoryData && memoryData.length > 0) {
        memoryPromptContext = "\nHIGH-PRIORITY OKIKE BLUEPRINT EXEMPLARS (TRAINED FROM TEAM FEEDBACK):\n";
        for (const mem of memoryData) {
          memoryPromptContext += `- Category: ${mem.pattern_category}\n  Exemplar Blueprint: ${mem.successful_blueprint_summary}\n`;
        }
        addLog("success", `Loaded ${memoryData.length} learned memory exemplars to guide evaluation.`);
      } else {
        addLog("info", "Neural memory online. Ready to absorb team feedback.");
      }
    } catch {
      addLog("warn", "Could not query memory exemplars. Proceeding with standard evaluation.");
    }

    addLog("info", `Initiating multi-source reconnaissance: [${targetRegion.toUpperCase()}] / Depth: [${depth.toUpperCase()}]`);

    const rawObservations: RawObservation[] = [];

    // --- SOURCE 1: GitHub High-Impact Issues & Ecosystem Trackers ---
    if (selectedSource === "all" || selectedSource === "github") {
      addLog("info", "Querying GitHub ecosystem repositories & developer issues...");
      let locationFilter = "";
      if (locQuery && locQuery !== "Global") {
        locationFilter = ` "${locQuery}"`;
      }

      let objectiveKeyword = "is:issue state:open label:bug";
      if (objective === "saas_opportunities") objectiveKeyword = 'is:issue state:open "feature request"';
      else if (objective === "ai_opportunities") objectiveKeyword = 'is:issue state:open (label:ai OR "LLM" OR "AI")';
      else if (objective === "infrastructure_problems") objectiveKeyword = 'is:issue state:open (label:performance OR "cloud" OR "docker")';

      const queries = [
        `${objectiveKeyword}${locationFilter}`,
        `is:issue state:open "help wanted"${locationFilter}`
      ];

      for (const q of queries) {
        const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc&per_page=${perPage}`;
        try {
          const res = await fetch(url, {
            headers: {
              "User-Agent": "OKIKE-Market-Intelligence/2.0",
              "Accept": "application/vnd.github.v3+json"
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                rawObservations.push({
                  title: item.title,
                  body: item.body || "",
                  url: item.html_url,
                  platform: "github"
                });
              }
            }
          }
        } catch {}
      }
    }

    // --- SOURCE 2: Hacker News (Y Combinator) Live API (Ask HN & Production Pain Points) ---
    if (selectedSource === "all" || selectedSource === "hackernews") {
      addLog("info", "Querying Hacker News (Y Combinator) live founder & developer requests...");
      try {
        const hnRes = await fetch("https://hacker-news.firebaseio.com/v0/askstories.json");
        if (hnRes.ok) {
          const storyIds: number[] = await hnRes.json();
          const targetIds = (storyIds || []).slice(0, depth === "quick" ? 4 : 8);

          const storyPromises = targetIds.map(async (id) => {
            const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            if (itemRes.ok) return itemRes.json();
            return null;
          });

          const stories = await Promise.all(storyPromises);
          for (const s of stories) {
            if (s && s.title && (s.text || s.title)) {
              rawObservations.push({
                title: s.title,
                body: s.text ? s.text.replace(/<[^>]*>?/gm, "") : s.title,
                url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
                platform: "hackernews"
              });
            }
          }
        }
      } catch (err: any) {
        addLog("warn", `Hacker News feed notice: ${err.message}`);
      }
    }

    // --- SOURCE 3: StackOverflow API (Production Developer Bottlenecks) ---
    if (selectedSource === "all" || selectedSource === "stackoverflow") {
      addLog("info", "Querying StackOverflow developer friction & unsolved architecture threads...");
      try {
        let tag = "reactjs;next.js";
        if (objective === "ai_opportunities") tag = "python;openai-api;llm";
        else if (objective === "infrastructure_problems") tag = "docker;kubernetes;aws";
        else if (objective === "saas_opportunities") tag = "stripe;authentication;typescript";

        const soUrl = `https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&tagged=${tag}&site=stackoverflow&pagesize=${perPage}&filter=!9_bDDxJY5`;
        const soRes = await fetch(soUrl);
        if (soRes.ok) {
          const soData = await soRes.json();
          if (soData.items && Array.isArray(soData.items)) {
            for (const q of soData.items) {
              rawObservations.push({
                title: q.title ? q.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : "",
                body: `Tags: ${(q.tags || []).join(", ")}. View count: ${q.view_count}. Score: ${q.score}.`,
                url: q.link,
                platform: "stackoverflow"
              });
            }
          }
        }
      } catch (err: any) {
        addLog("warn", `StackOverflow feed notice: ${err.message}`);
      }
    }

    // --- SOURCE 4: Dev.to Technical Radar API ---
    if (selectedSource === "all" || selectedSource === "devto") {
      try {
        const devRes = await fetch(`https://dev.to/api/articles?tag=discuss&per_page=6`);
        if (devRes.ok) {
          const devArticles = await devRes.json();
          if (Array.isArray(devArticles)) {
            for (const a of devArticles) {
              rawObservations.push({
                title: a.title,
                body: a.description || a.title,
                url: a.url,
                platform: "dev.to"
              });
            }
          }
        }
      } catch {}
    }

    if (rawObservations.length === 0) {
      addLog("error", "No real-world observations returned from external APIs. Research mission ended.");
      return { ok: false, insertedCount };
    }

    // Deduplicate observations by URL
    const uniqueObservationsMap = new Map<string, RawObservation>();
    for (const obs of rawObservations) {
      if (obs.url && obs.title) {
        uniqueObservationsMap.set(obs.url, obs);
      }
    }
    const uniqueObservations = Array.from(uniqueObservationsMap.values());
    addLog("info", `Aggregated ${rawObservations.length} live observations from top industry spots (${uniqueObservations.length} unique).`);

    // Deduplicate against existing database records
    const urlsToCheck = uniqueObservations.map((i) => i.url);
    const { data: existingIssues, error: dbErr } = await (supabaseAdmin as any)
      .from("scraped_issues")
      .select("source_url")
      .in("source_url", urlsToCheck);

    if (dbErr) {
      addLog("error", `Database deduplication check error: ${dbErr.message}`);
      return { ok: false, insertedCount };
    }

    const existingUrls = new Set((existingIssues ?? []).map((r: any) => r.source_url));
    const newObservations = uniqueObservations.filter((i) => !existingUrls.has(i.url));
    addLog(
      "info",
      `Filtered out ${uniqueObservations.length - newObservations.length} previously analyzed records. ${newObservations.length} new candidate problems to evaluate.`
    );

    if (newObservations.length === 0) {
      addLog("success", "All current observations already analyzed. Database is up to date.");
      return { ok: true, insertedCount: 0 };
    }

    const itemsToEvaluate = newObservations.slice(0, maxAnalyze);
    addLog("info", `Initiating neural evaluation on top ${itemsToEvaluate.length} real-world candidate problem spots...`);

    const systemPrompt = `You are the OKIKE Autonomous Market Intelligence & Strategic Solution Engine.
Your mission is to evaluate real-world technical problems, developer friction, SaaS market gaps, and infrastructure bottlenecks.
You will assess whether each problem represents a high-impact commercial or educational solution opportunity for OKIKE.

${memoryPromptContext}

EVALUATION CRITERIA:
1. Category must be one of: "Web App Dev", "AI/ML", "DevOps/Cloud", "Cybersecurity", "Payments", "Mobile App Dev", "Data Engineering".
2. market_value_score (0-100):
   - 80-100: Critical real-world friction point with high commercial demand where OKIKE can build a tool, template, SaaS, or curriculum.
   - 60-79: Moderate recurring technical problem with clear industry impact.
   - <60: Trivial bug or niche issue.
3. description: A sharp 2-3 sentence breakdown of the real-world friction, what developers/businesses are suffering from, and the strategic commercial opportunity.

Return ONLY a valid JSON object in this exact schema:
{
  "category": "Web App Dev",
  "market_value_score": 88,
  "description": "Short 2-3 sentence market assessment and real-world opportunity summary."
}`;

    for (const obs of itemsToEvaluate) {
      const userPrompt = `Origin Spot: ${obs.platform.toUpperCase()}
Target Geographic Scope: ${targetRegion} (${targetCountry})
Research Objective: ${objective}
Title: ${obs.title}
Body snippet: ${obs.body ? obs.body.slice(0, 800) : "No description provided."}
URL: ${obs.url}`;

      try {
        const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://okike.ai",
            "X-Title": "OKIKE Market Intelligence",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!apiRes.ok) {
          addLog("warn", `AI model returned HTTP ${apiRes.status} for "${obs.title.slice(0, 30)}..."`);
          continue;
        }

        const completion = await apiRes.json();
        const contentStr = completion.choices?.[0]?.message?.content;
        if (!contentStr) continue;

        const parsed = JSON.parse(contentStr);

        const category = parsed.category || "Web App Dev";
        const marketValueScore = typeof parsed.market_value_score === "number" ? parsed.market_value_score : 70;
        const description = parsed.description || obs.title;

        const { error: insertErr } = await (supabaseAdmin as any)
          .from("scraped_issues")
          .insert({
            title: obs.title,
            description,
            source_url: obs.url,
            source_platform: obs.platform,
            category,
            market_value_score: marketValueScore,
            location_region: targetRegion,
            location_country: targetCountry === "Global" ? "United States" : targetCountry,
            status: "new",
            feedback_score: 0,
          });

        if (!insertErr) {
          insertedCount++;
          addLog(
            "success",
            `Discovered [${obs.platform.toUpperCase()}]: "${obs.title.slice(0, 45)}..." -> ${category} (Score ${marketValueScore})`
          );
        } else {
          addLog("warn", `Insert error for "${obs.title.slice(0, 30)}": ${insertErr.message}`);
        }
      } catch (err: any) {
        addLog("warn", `Evaluation failed for "${obs.title.slice(0, 30)}": ${err.message}`);
      }
    }

    addLog(
      "success",
      `RECONNAISSANCE MISSION COMPLETE. Integrated ${insertedCount} new real-world opportunity blueprints into Supabase database.`
    );
    return { ok: true, insertedCount };
  } catch (err: any) {
    addLog("error", `Mission fatal exception: ${err.message}`);
    return { ok: false, insertedCount };
  }
}
