import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Start a Project or Enroll — OKIKE Enterprises" },
      {
        name: "description",
        content:
          "Scope a startup or business software project with OKIKE Studio (studio.okikeenterprises.com/enquiry) or enroll in OKIKE Academy.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://studio.okikeenterprises.com/enquiry" }],
  }),
  component: BookGatewayPage,
});

function BookGatewayPage() {
  return (
    <SiteLayout>
      <section className="py-24 px-6 min-h-[78vh] flex items-center">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-10">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-brand mb-4">
              <span className="h-px w-8 bg-brand" />
              <span>00 // OKIKE ECOSYSTEM GATEWAY</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-wide uppercase text-ink">
              Choose Your{" "}
              <span className="text-brand">Destination.</span>
            </h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Branch 01 & 02: Studio & Startups */}
            <a
              href="https://studio.okikeenterprises.com/enquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-8 border border-ink/15 hover:border-brand bg-ink/[0.02] hover:bg-ink/[0.04] transition flex flex-col justify-between gap-8"
            >
              <div className="flex flex-col gap-4">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand">
                  01–02 // STARTUPS &amp; BUSINESSES
                </span>
                <h2 className="font-display text-4xl tracking-wide uppercase text-ink">
                  Scope a Project on OKIKE Studio
                </h2>
                <p className="text-sm text-ink/65 leading-relaxed">
                  Project scoping, brand systems, web platforms, mobile apps, and custom startup
                  MVPs now live on our dedicated Studio platform at{" "}
                  <span className="font-mono text-ink">studio.okikeenterprises.com/enquiry</span>.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-brand">
                <span>Continue to Studio Enquiry</span>
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </a>

            {/* Branch 03: Students */}
            <Link
              to="/enroll"
              className="group p-8 border border-ink/15 hover:border-brand bg-ink/[0.02] hover:bg-ink/[0.04] transition flex flex-col justify-between gap-8"
            >
              <div className="flex flex-col gap-4">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand">
                  03 // STUDENTS &amp; COHORTS
                </span>
                <h2 className="font-display text-4xl tracking-wide uppercase text-ink">
                  Enroll in OKIKE Academy
                </h2>
                <p className="text-sm text-ink/65 leading-relaxed">
                  Join our engineering cohorts in Fullstack Web, UI/UX Systems, Mobile Dev, Python
                  &amp; AI, or register for the Computing Synergy Summit.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink group-hover:text-brand transition">
                <span>Proceed to Academy Enrollment</span>
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
