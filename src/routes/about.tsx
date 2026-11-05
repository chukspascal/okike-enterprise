import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import founderImg from "@/assets/founder.jpg";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Code2, GraduationCap, ArrowUpRight, Rocket } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OKIKE Enterprises — Structure Before Scale" },
      {
        name: "description",
        content:
          "OKIKE Enterprises is a culturally intentional creative and technology institution. We build startups, grow businesses through OKIKE Studio, and train engineers through OKIKE Academy.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "About OKIKE Enterprises — Structure Before Scale" },
      {
        property: "og:description",
        content:
          "An institution that births other institutions. Discover our story, our philosophy, and our 3 core branches.",
      },
    ],
    links: [{ rel: "canonical", href: "https://okike-enterprise.com/about" }],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    number: "01",
    title: "OKIKE Ventures & Labs",
    headline: "We build startups",
    desc: "Co-architecting early-stage ventures from raw thesis to validated, market-ready MVPs in weeks.",
    linkText: "Explore Ventures",
    linkHref: "/#branch-01",
    external: false,
    icon: Rocket,
  },
  {
    number: "02",
    title: "OKIKE Studio",
    headline: "We grow businesses",
    desc: "Our dedicated engineering and design practice building world-class web, mobile, and custom software systems.",
    linkText: "studio.okikeenterprises.com",
    linkHref: "https://studio.okikeenterprises.com",
    external: true,
    icon: Code2,
  },
  {
    number: "03",
    title: "OKIKE Academy",
    headline: "We teach students",
    desc: "Intensive, project-driven engineering cohorts, daily challenge portals, and the annual Computing Synergy Summit.",
    linkText: "Explore Academy",
    linkHref: "/learn",
    external: false,
    icon: GraduationCap,
  },
];

const VALUES = [
  {
    title: "Structure Before Scale",
    desc: "Most systems collapse under growth when their foundational architecture is weak. We build enduring systems from day one.",
  },
  {
    title: "An Institution That Births Institutions",
    desc: "We do not merely take on fragmented client tasks; we design platforms and train people capable of founding and leading enterprises.",
  },
  {
    title: "Culturally Intentional, Globally Engineered",
    desc: "African intelligence and cultural context paired with rigorous international technical standards and cloud-native stacks.",
  },
  {
    title: "Skin in the Game",
    desc: "We build internal proprietary products and teach students with the exact same tools and code we deploy for production businesses.",
  },
];

function AboutPage() {
  const [founderInfo, setFounderInfo] = useState<{
    founder_name?: string;
    founder_title?: string;
    founder_quote?: string;
    founder_letter_p1?: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: dbSettings } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["about_founder_story"]);

        if (dbSettings && dbSettings.length > 0) {
          setFounderInfo(dbSettings[0].value as any);
        }
      } catch (err) {
        console.error("Error loading about page data:", err);
      }
    }
    loadData();
  }, []);

  return (
    <SiteLayout>
      {/* ─── HERO (FLAT STUDIO BLACK + #E3EE32 — NO GRADIENTS/BLURS) ─── */}
      <section className="relative overflow-hidden bg-[#0E0E0E] border-b border-white/10 py-20 md:py-28 px-6">
        <div className="relative max-w-6xl mx-auto">
          <div className="mb-6">
            <span className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-white/60">
              <span className="w-8 h-px bg-[#E3EE32]" />
              About OKIKE Enterprises
            </span>
          </div>

          <h1 className="font-display text-[clamp(3rem,7.5vw,6rem)] leading-[0.94] tracking-wide uppercase text-white max-w-4xl">
            An institution that births{" "}
            <span className="text-[#E3EE32]">other institutions.</span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-white/75 max-w-2xl leading-relaxed">
            OKIKE is a culturally intentional creative and technological institute. Rather than
            operating as a traditional agency, we build the technological foundations and human
            capacity that anchor enduring ventures.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="https://studio.okikeenterprises.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#E3EE32] hover:bg-[#d4df28] text-[#0E0E0E] px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              OKIKE Studio
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <Link
              to="/learn"
              className="bg-[#151514] hover:bg-[#1f1f1d] text-white border border-white/15 px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              OKIKE Academy
            </Link>
          </div>
        </div>
      </section>

      {/* ─── THREE PILLARS BREAKDOWN ─── */}
      <section className="py-24 px-6 bg-[#0E0E0E] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
                Operating Structure
              </span>
              <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white mt-2">
                Three Specialized Branches.
              </h2>
            </div>
            <p className="text-sm text-white/70 max-w-xs">
              Organized to serve distinct stakeholders with dedicated focus and zero dilution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.number}
                  className="p-8 rounded-2xl border border-white/10 bg-[#151514] flex flex-col justify-between gap-6 hover:border-[#E3EE32] transition-colors"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="size-10 rounded-xl bg-[#E3EE32]/15 text-[#E3EE32] flex items-center justify-center">
                        <Icon className="size-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#E3EE32]">{p.number}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-2">{p.title}</h3>
                    <div className="font-mono text-xs font-semibold text-[#E3EE32] uppercase">
                      {p.headline}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed mt-1">{p.desc}</p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    {p.external ? (
                      <a
                        href={p.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E3EE32] hover:text-white transition"
                      >
                        {p.linkText} <ArrowUpRight className="size-4" />
                      </a>
                    ) : (
                      <Link
                        to={p.linkHref}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E3EE32] hover:text-white transition"
                      >
                        {p.linkText} <ArrowUpRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── INSTITUTIONAL VALUES ─── */}
      <section className="py-24 px-6 bg-[#0E0E0E] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
              Foundational Principles
            </span>
            <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white mt-2">
              Philosophy &amp; Standards.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {VALUES.map((val, idx) => (
              <div
                key={val.title}
                className="bg-[#151514] rounded-2xl border border-white/10 p-8 flex flex-col gap-2.5"
              >
                <span className="font-mono text-xs font-bold text-[#E3EE32]">
                  0{idx + 1} // PRINCIPLE
                </span>
                <h3 className="text-xl font-bold text-white">{val.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOUNDER NOTE ─── */}
      <section className="py-24 px-6 bg-[#0E0E0E]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5">
            <div className="rounded-3xl overflow-hidden border border-[#E3EE32]/40 bg-[#151514] p-2">
              <img
                src={founderImg}
                alt="OKIKE Founder"
                className="w-full aspect-[4/5] object-cover rounded-2xl"
              />
            </div>
          </div>

          <div className="md:col-span-7 flex flex-col gap-5">
            <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
              Founder Perspective
            </div>
            <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white leading-tight">
              Crafted with heritage. Engineered for the global stage.
            </h2>
            <div className="space-y-4 text-sm md:text-base text-white/75 leading-relaxed">
              <p>
                {founderInfo?.founder_quote ||
                  `"OKIKE was born from a clear conviction: African technical talent shouldn't merely execute outsourced tasks—it should architect, lead, and birth world-class institutions."`}
              </p>
              <p>
                {founderInfo?.founder_letter_p1 ||
                  "By operating across three deliberate branches—building startups, growing businesses through OKIKE Studio, and training developers in OKIKE Academy—we create a self-reinforcing flywheel where every line of code compounds in value."}
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-[#E3EE32] font-bold">
                {founderInfo?.founder_name || "Anas & The OKIKE Collective"}
              </span>
              <span className="text-xs text-white/40">·</span>
              <span className="text-xs text-white/60">Nigeria — Global Operations</span>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
