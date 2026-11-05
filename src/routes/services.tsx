import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "OKIKE Studio Capabilities — Moved to studio.okikeenterprises.com" },
      {
        name: "description",
        content:
          "OKIKE's software engineering, brand identity, and product development capabilities now live at studio.okikeenterprises.com/services.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://studio.okikeenterprises.com/services" }],
  }),
  component: ServicesRedirectPage,
});

function ServicesRedirectPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "https://studio.okikeenterprises.com/services";
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
            Services Now Live on{" "}
            <span className="text-brand">OKIKE Studio.</span>
          </h1>
          <p className="text-ink/65 text-base leading-relaxed mb-8 max-w-xl">
            We have moved all client engineering, brand systems, and product capabilities to our
            dedicated Studio platform at{" "}
            <span className="font-mono text-ink">studio.okikeenterprises.com</span>. Redirecting you
            automatically...
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://studio.okikeenterprises.com/services"
              className="group bg-brand text-brand-foreground py-3.5 pl-7 pr-5 inline-flex items-center gap-2 font-semibold text-xs uppercase tracking-widest hover:opacity-90 transition"
            >
              Continue to OKIKE Studio Services
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
