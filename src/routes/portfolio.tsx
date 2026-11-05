import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "OKIKE Studio Selected Work — Moved to studio.okikeenterprises.com" },
      {
        name: "description",
        content:
          "Explore OKIKE Studio's case studies and shipped products at studio.okikeenterprises.com/work.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://studio.okikeenterprises.com/work" }],
  }),
  component: PortfolioRedirectPage,
});

function PortfolioRedirectPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "https://studio.okikeenterprises.com/work";
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SiteLayout>
      <section className="py-28 px-6 min-h-[75vh] flex items-center">
        <div className="max-w-3xl mx-auto w-full border border-ink/15 bg-ink/[0.02] p-8 md:p-12">
          <div className="flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-brand mb-4">
            <span className="size-2 rounded-full bg-[#E0EB32] animate-pulse" />
            <span>02 // ECOSYSTEM ROUTING — OKIKE STUDIO</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.92] tracking-wide uppercase text-ink mb-4">
            Portfolio &amp; Case Studies Live on{" "}
            <span className="text-brand">OKIKE Studio.</span>
          </h1>
          <p className="text-ink/65 text-base leading-relaxed mb-8 max-w-xl">
            Our shipped products, engineering case studies, and brand transformations are now
            showcased on our dedicated Studio platform at{" "}
            <span className="font-mono text-ink">studio.okikeenterprises.com/work</span>.
            Redirecting you automatically...
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://studio.okikeenterprises.com/work"
              className="group bg-brand text-brand-foreground py-3.5 pl-7 pr-5 inline-flex items-center gap-2 font-semibold text-xs uppercase tracking-widest hover:opacity-90 transition"
            >
              Continue to OKIKE Studio Work
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <Link
              to="/"
              className="font-mono text-xs uppercase tracking-widest text-ink/60 hover:text-ink px-4 py-3 transition"
            >
              ← Back to Parent Hub
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
