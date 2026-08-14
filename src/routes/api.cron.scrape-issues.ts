import { createFileRoute } from "@tanstack/react-router";
import { runScraperCore } from "@/lib/scraper.server";

export const Route = createFileRoute("/api/cron/scrape-issues")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        // Validate the cron secret header
        const authHeader = request.headers.get("authorization");
        const xCronSecret = request.headers.get("x-cron-secret");
        const expected = process.env.CRON_SECRET;

        const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        const isAuthorized = expected && (bearerToken === expected || xCronSecret === expected);

        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const logs: any[] = [];
        console.log("[cron/scrape-issues] Starting autonomous market research scan...");
        
        const result = await runScraperCore(logs);

        console.log(`[cron/scrape-issues] Finished scan. Status: ${result.ok}. Opportunities found: ${result.insertedCount}`);
        
        return new Response(
          JSON.stringify({
            ok: result.ok,
            message: `Scraper cycle completed. Added ${result.insertedCount} new market opportunities.`,
            logs
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      },
    },
  },
});
