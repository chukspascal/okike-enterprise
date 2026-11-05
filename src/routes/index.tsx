import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Code2, GraduationCap, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { WelcomeAI } from "@/components/site/WelcomeAI";
import { getPartners, type PublicPartner } from "@/lib/public-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OKIKE — Startups. Businesses. Students." },
      {
        name: "description",
        content:
          "OKIKE builds startups, grows businesses through OKIKE Studio, and trains engineers through OKIKE Academy.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://okike-enterprise.com/" },
      { property: "og:title", content: "OKIKE — Startups. Businesses. Students." },
      {
        property: "og:description",
        content: "We build startups, grow businesses, and teach students.",
      },
    ],
    links: [{ rel: "canonical", href: "https://okike-enterprise.com/" }],
  }),
  component: HomePage,
});

const BRANCHES = [
  {
    number: "01",
    name: "Startups",
    unit: "OKIKE Ventures & AI Labs",
    description:
      "Early-stage venture architecture, rapid MVP engineering, and proprietary AI tools. We partner with founders to turn raw theses into live, market-ready products in weeks.",
    buildTitle: "What we co-build",
    build: [
      "Zero-to-one web and mobile MVPs designed, engineered, and shipped in 2–3 weeks",
      "Autonomous AI workflows, market intelligence terminals, and internal SaaS tools",
      "Scalable cloud architecture, database schemas, and production design systems",
    ],
    fit: "First-time founders, solo builders, and early-stage venture teams",
    cta: "Scope a startup MVP →",
    href: "https://studio.okikeenterprises.com/enquiry?package=custom-software",
    external: true,
    outerBg: "bg-[#151514] border-[#E3EE32]/40",
    panelBg: "bg-[#E3EE32] text-[#0E0E0E]",
    panelTitleColor: "text-[#0E0E0E]",
    panelItemColor: "text-[#0E0E0E]/90",
    panelDivider: "divide-[#0E0E0E]/15 border-[#0E0E0E]/15",
    fitLabelColor: "text-[#0E0E0E]",
    fitTextColor: "text-[#0E0E0E]/85",
  },
  {
    number: "02",
    name: "Businesses",
    unit: "OKIKE Studio — studio.okikeenterprises.com",
    description:
      "Brand identity systems, high-conversion web platforms, mobile applications, and custom internal software engineered to help established companies modernise and scale.",
    buildTitle: "What Studio delivers",
    build: [
      "Enduring brand identities, design systems, and high-converting marketing sites",
      "Custom web applications, customer portals, and cross-platform mobile apps",
      "Workflow automation, payment integrations, and executive operational dashboards",
    ],
    fit: "SMEs, growing brands, institutions, and enterprises ready to scale",
    cta: "Visit OKIKE Studio ↗",
    href: "https://studio.okikeenterprises.com",
    external: true,
    outerBg: "bg-[#171716] border-white/20",
    panelBg: "bg-[#C4B0F0] text-[#0E0E0E]",
    panelTitleColor: "text-[#0E0E0E]",
    panelItemColor: "text-[#0E0E0E]/90",
    panelDivider: "divide-[#0E0E0E]/15 border-[#0E0E0E]/15",
    fitLabelColor: "text-[#0E0E0E]",
    fitTextColor: "text-[#0E0E0E]/85",
  },
  {
    number: "03",
    name: "Students",
    unit: "OKIKE Academy & Computing Synergy Summit",
    description:
      "Project-based engineering cohorts, daily coding challenges inside our live student portal, and direct mentorship from practising engineers building real production systems.",
    buildTitle: "What students master",
    build: [
      "Structured 8–12 week tracks in Fullstack Web, UI/UX, Mobile, Python & Cybersecurity",
      "Interactive student portal with daily coding challenges, leaderboards, and live classes",
      "Flagship Computing Synergy Summit (Aug 1, 2026) — free pass for CS/IT students",
    ],
    fit: "University students, career switchers, and self-taught developers",
    cta: "Explore the Academy →",
    href: "/learn",
    external: false,
    outerBg: "bg-[#151514] border-[#E3EE32]/45",
    panelBg: "bg-[#E3EE32] text-[#0E0E0E]",
    panelTitleColor: "text-[#0E0E0E]",
    panelItemColor: "text-[#0E0E0E]/90",
    panelDivider: "divide-[#0E0E0E]/15 border-[#0E0E0E]/15",
    fitLabelColor: "text-[#0E0E0E]",
    fitTextColor: "text-[#0E0E0E]/85",
  },
] as const;

// Sticky offsets so each stacked card leaves a clean 22px rim visible above it
const STICKY_BASE = 92;
const STICKY_STEP = 22;

const HERO_WORDS = ["STARTUPS", "BUSINESSES", "ENGINEERS", "PRODUCTS"];

const FALLBACK_PARTNERS: PublicPartner[] = [
  { id: "p-1", name: "NACOS", logo_url: null, url: "https://nacos-aksu.vercel.app/" },
  { id: "p-2", name: "KRAIT", logo_url: null, url: "https://usekrait.com" },
  { id: "p-3", name: "DATADOM", logo_url: null, url: "https://datadom.vercel.app/" },
  { id: "p-4", name: "MANSFILL ICT", logo_url: null, url: "https://www.mansfillictservices.com/" },
  { id: "p-5", name: "COACH ZIRI", logo_url: null, url: "https://coach-ziri.vercel.app/" },
];

function AsciiSphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "░▒▓█▀▄▌▐│─┤├┴┬╭╮╰╯";
    let angle = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = 0.44 * Math.min(rect.width, rect.height);

      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const points: { x: number; y: number; z: number; char: string }[] = [];
      for (let phi = 0; phi < 2 * Math.PI; phi += 0.15) {
        for (let theta = 0; theta < Math.PI; theta += 0.15) {
          const x0 = Math.sin(theta) * Math.cos(phi + 0.5 * angle);
          const y0 = Math.sin(theta) * Math.sin(phi + 0.5 * angle);
          const z0 = Math.cos(theta);

          const ry = 0.3 * angle;
          const x1 = x0 * Math.cos(ry) - z0 * Math.sin(ry);
          const z1 = x0 * Math.sin(ry) + z0 * Math.cos(ry);

          const rx = 0.2 * angle;
          const y2 = y0 * Math.cos(rx) - z1 * Math.sin(rx);
          const z2 = y0 * Math.sin(rx) + z1 * Math.cos(rx);

          const charIdx = Math.floor(((z2 + 1) / 2) * (chars.length - 1));
          points.push({
            x: cx + x1 * radius,
            y: cy + y2 * radius,
            z: z2,
            char: chars[charIdx] || "░",
          });
        }
      }

      points.sort((a, b) => a.z - b.z);
      for (const pt of points) {
        const alpha = 0.14 + (pt.z + 1) * 0.42;
        if (pt.z > 0.35) {
          ctx.fillStyle = `rgba(227, 238, 50, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.72).toFixed(3)})`;
        }
        ctx.fillText(pt.char, pt.x, pt.y);
      }

      angle += 0.018;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

function HomePage() {
  const [partners, setPartners] = useState<PublicPartner[]>([]);
  const [mounted, setMounted] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
    getPartners().then((data) => {
      if (data && data.length > 0) setPartners(data);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % HERO_WORDS.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const displayPartners = partners.length > 0 ? partners : FALLBACK_PARTNERS;

  return (
    <>
      <SiteLayout>
        {/* ─── 1. FLAT ARCHITECTURAL HERO STAGE (ZERO GRADIENTS / BLURS) ─── */}
        <div className="relative min-h-[calc(100svh-4rem)] flex flex-col justify-between overflow-hidden bg-[#0E0E0E] border-b border-white/10">
          {/* 3D Rotating ASCII Sphere Canvas on the Right */}
          <div
            aria-hidden
            className="absolute right-0 lg:right-12 top-1/2 -translate-y-1/2 w-[460px] h-[460px] lg:w-[640px] lg:h-[640px] opacity-55 pointer-events-none"
          >
            <AsciiSphereCanvas />
          </div>

          {/* Main Hero Content */}
          <div className="relative z-10 w-full max-w-[1360px] mx-auto px-6 lg:px-12 pt-16 pb-16 lg:pt-24 lg:pb-20 my-auto">
            {/* Eyebrow Line */}
            <div
              className={`mb-8 transition-all duration-700 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-white/60">
                <span className="w-8 h-px bg-[#E3EE32]" />
                OKIKE Enterprises · Parent Institution
              </span>
            </div>

            {/* Refined Institutional Headline with Balanced Typography */}
            <div className="mb-10 max-w-4xl">
              <h1
                className={`font-display text-[clamp(2.5rem,5.5vw,4.8rem)] leading-[0.98] tracking-normal uppercase text-white transition-all duration-1000 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <span className="block">The institution</span>
                <span className="block mt-2">
                  to build{" "}
                  <span className="relative inline-block text-[#E3EE32]">
                    <span key={wordIdx} className="inline-flex">
                      {HERO_WORDS[wordIdx].split("").map((char, idx) => (
                        <span
                          key={`${wordIdx}-${idx}`}
                          className="inline-block animate-char-in"
                          style={{ animationDelay: `${idx * 45}ms` }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                    <span className="absolute -bottom-1 left-0 right-0 h-2 bg-[#E3EE32]/30" />
                  </span>
                </span>
              </h1>
            </div>

            {/* 2-Column Subheadline + Solid CTAs */}
            <div className="grid lg:grid-cols-12 gap-8 items-end">
              <p
                className={`lg:col-span-7 text-base lg:text-lg text-white/70 leading-relaxed max-w-xl transition-all duration-700 delay-150 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                Three focused branches under one roof—incubating early-stage ventures, engineering
                production software through{" "}
                <a
                  href="https://studio.okikeenterprises.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-medium underline decoration-[#E3EE32] underline-offset-4 hover:text-[#E3EE32] transition-colors"
                >
                  OKIKE Studio
                </a>
                , and training engineers inside{" "}
                <Link
                  to="/learn"
                  className="text-white font-medium underline decoration-[#E3EE32] underline-offset-4 hover:text-[#E3EE32] transition-colors"
                >
                  OKIKE Academy
                </Link>
                .
              </p>

              <div
                className={`lg:col-span-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 transition-all duration-700 delay-300 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <a
                  href="https://studio.okikeenterprises.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 bg-[#E3EE32] hover:bg-[#d4df28] text-[#0E0E0E] font-semibold px-6 h-12 text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  <span>Launch OKIKE Studio</span>
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
                <Link
                  to="/learn"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 text-xs font-semibold uppercase tracking-wider rounded-lg border border-white/20 text-white hover:border-[#E3EE32] hover:text-[#E3EE32] transition-colors"
                >
                  <span>Explore Academy</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Integrated Proof & Partners Marquee Strip (Solid Flat Edges) */}
          <div className="relative z-10 border-t border-white/10 bg-[#121211] py-6">
            <div className="relative w-full overflow-hidden">
              <div className="animate-marquee items-center gap-16 whitespace-nowrap">
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex items-center gap-16 shrink-0">
                    {/* Ecosystem Metrics */}
                    <div className="flex items-baseline gap-3.5">
                      <span className="text-3xl lg:text-4xl font-display text-white">2–3 wks</span>
                      <span className="text-xs text-white/55">
                        average MVP delivery
                        <span className="block font-mono text-[10px] text-[#E3EE32] uppercase tracking-widest mt-0.5">
                          01 / OKIKE VENTURES
                        </span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3.5">
                      <span className="text-3xl lg:text-4xl font-display text-white">100+</span>
                      <span className="text-xs text-white/55">
                        active portal engineers
                        <span className="block font-mono text-[10px] text-[#E3EE32] uppercase tracking-widest mt-0.5">
                          03 / OKIKE ACADEMY
                        </span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3.5">
                      <span className="text-3xl lg:text-4xl font-display text-white">3 Branches</span>
                      <span className="text-xs text-white/55">
                        unified execution system
                        <span className="block font-mono text-[10px] text-[#E3EE32] uppercase tracking-widest mt-0.5">
                          02 / OKIKE STUDIO
                        </span>
                      </span>
                    </div>

                    {/* Verified Partners */}
                    {displayPartners.map((p) => (
                      <a
                        key={`${p.id}-${dup}`}
                        href={p.url || "#"}
                        target={p.url ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3.5 px-4 py-1.5 rounded-lg border border-white/10 bg-[#151514] hover:border-[#E3EE32] transition-colors"
                      >
                        {p.logo_url && (
                          <img
                            src={p.logo_url}
                            alt={p.name}
                            className="h-7 max-w-[110px] w-auto object-contain brightness-125"
                          />
                        )}
                        <div>
                          <span className="block font-display text-xl tracking-wide text-white group-hover:text-[#E3EE32] transition-colors">
                            {p.name}
                          </span>
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-white/45">
                            VERIFIED PARTNER
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. STACKED SCROLL SLIDER (CARDS RISE FROM BOTTOM TO TOP WITH VISIBLE RIMS) ─── */}
        <StackedBranches />

        {/* ─── 3. ECOSYSTEM PROOF & SUMMIT BENTO ─── */}
        <section className="py-24 px-6 bg-[#0E0E0E] border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <div className="text-xs font-mono font-semibold uppercase tracking-widest text-[#E3EE32] mb-2">
                  Inside the Ecosystem
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Built to ship products and grow engineers.
                </h2>
              </div>
              <p className="text-sm text-white/70 max-w-sm">
                Every branch of OKIKE reinforces the others—our Studio engineers mentor our Academy
                cohorts, and our top graduates build alongside our venture team.
              </p>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
              {/* Bento 1: Studio */}
              <div className="md:col-span-4 rounded-2xl bg-[#151514] border border-white/10 hover:border-[#E3EE32] p-7 flex flex-col justify-between gap-8 transition-colors">
                <div>
                  <div className="size-10 rounded-xl bg-[#E3EE32]/15 text-[#E3EE32] flex items-center justify-center mb-5">
                    <Code2 className="size-5" />
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#E3EE32] uppercase tracking-wider">
                    OKIKE Studio
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Dedicated Client Platform
                  </h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">
                    Scope fixed-price packages, review case studies, and track active sprints on our
                    dedicated Studio site.
                  </p>
                </div>
                <a
                  href="https://studio.okikeenterprises.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E3EE32] hover:text-white transition"
                >
                  studio.okikeenterprises.com <ArrowUpRight className="size-4" />
                </a>
              </div>

              {/* Bento 2: Academy Portal */}
              <div className="md:col-span-4 rounded-2xl bg-[#151514] border border-white/10 hover:border-[#E3EE32] p-7 flex flex-col justify-between gap-8 transition-colors">
                <div>
                  <div className="size-10 rounded-xl bg-[#E3EE32]/15 text-[#E3EE32] flex items-center justify-center mb-5">
                    <GraduationCap className="size-5" />
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#E3EE32] uppercase tracking-wider">
                    OKIKE Academy
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">
                    100+ Active Portal Students
                  </h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">
                    Registered students learn inside our interactive portal featuring daily coding
                    challenges, live night classes, and mentor reviews.
                  </p>
                </div>
                <Link
                  to="/learn"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E3EE32] hover:text-white transition"
                >
                  View curriculum tracks <ArrowUpRight className="size-4" />
                </Link>
              </div>

              {/* Bento 3: Computing Synergy Summit */}
              <div className="md:col-span-4 rounded-2xl bg-[#E3EE32] text-[#0E0E0E] p-7 flex flex-col justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0E0E0E] text-[#E3EE32] font-mono text-[11px] font-semibold uppercase tracking-wider mb-5">
                    <Calendar className="size-3.5" />
                    <span>August 1, 2026</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0E0E0E]">
                    Computing Synergy Summit
                  </h3>
                  <p className="text-sm text-[#0E0E0E]/85 mt-2 leading-relaxed">
                    Our flagship bootcamp and summit in Web, UI/UX, Python, and Cybersecurity. Free
                    admission for CS/IT department students.
                  </p>
                </div>
                <Link
                  to="/bootcamp"
                  className="bg-[#0E0E0E] hover:bg-black text-[#E3EE32] px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition"
                >
                  Reserve Summit Pass <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Institutional Partner Grid */}
            <div className="mt-20 pt-14 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#E3EE32]">
                    Institutional Network
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Collaborators, student bodies &amp; client partners.
                  </h3>
                </div>
                <span className="text-xs font-mono text-white/40">
                  Akwa Ibom · Lagos · Remote
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {displayPartners.map((p) => (
                  <a
                    key={p.id}
                    href={p.url || "#"}
                    target={p.url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center justify-center p-6 rounded-xl bg-[#151514] border border-white/10 hover:border-[#E3EE32] hover:bg-[#1a1a18] transition-all min-h-[110px]"
                  >
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt={p.name}
                        className="h-10 max-w-[120px] w-auto object-contain filter grayscale group-hover:grayscale-0 brightness-150 contrast-125 transition-all mb-2"
                      />
                    ) : null}
                    <span className="text-xs font-mono uppercase tracking-wider text-white/75 group-hover:text-white text-center">
                      {p.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SiteLayout>
      <WelcomeAI />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * StackedBranches — Upward scroll card deck on Obsidian Black (#07060B).
 * Each card is `position: sticky` with a 22px offset step and proportional
 * scale-down, so earlier cards remain visibly stacked as crisp rounded rims
 * above the active card as you scroll down.
 * ──────────────────────────────────────────────────────────────────────────── */
function StackedBranches() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let disposed = false;
    if (!reduceMotion) {
      import("lenis").then(({ default: Lenis }) => {
        if (disposed) return;
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
      });
    }

    const current: number[] = [];
    let vh = window.innerHeight;
    const onResize = () => {
      vh = window.innerHeight;
    };

    let raf = 0;
    const frame = (time: number) => {
      lenis?.raf(time);

      if (!reduceMotion) {
        const cards = cardRefs.current;
        const total = cards.length;

        const targets = cards.map((_, i) => {
          let overlapSum = 0;
          for (let j = i + 1; j < total; j++) {
            const subsequent = cards[j];
            if (!subsequent) continue;
            const top = subsequent.getBoundingClientRect().top;
            const stickTop = STICKY_BASE + j * STICKY_STEP;
            const p = (vh - top) / (vh - stickTop);
            const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
            overlapSum += clamped;
          }
          return overlapSum;
        });

        targets.forEach((target, i) => {
          const card = cards[i];
          if (!card) return;
          const prev = current[i] ?? target;
          const eased = prev + (target - prev) * 0.2;
          const value = Math.abs(target - eased) < 0.0005 ? target : eased;
          if (value === current[i]) return;
          current[i] = value;

          const scale = Math.max(0.9, 1 - 0.032 * value);
          card.style.transform = `translate3d(0, 0, 0) scale(${scale.toFixed(4)})`;
        });
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      lenis?.destroy();
    };
  }, []);

  const setRef = (i: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[i] = el;
  };

  return (
    <div id="branches" className="relative bg-[#0E0E0E] px-4 sm:px-6 pt-14 pb-28">
      <div className="max-w-6xl mx-auto flex flex-col gap-[14svh]">
        {BRANCHES.map((b, i) => (
          <div
            key={b.number}
            id={`branch-${b.number}`}
            ref={setRef(i)}
            style={{
              top: `${STICKY_BASE + i * STICKY_STEP}px`,
              transformOrigin: "50% 0%",
              backfaceVisibility: "hidden",
            }}
            className={`sticky rounded-3xl border will-change-transform ${b.outerBg}`}
          >
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 p-7 sm:p-10 lg:p-12 min-h-[480px] lg:min-h-[510px] items-center">
              {/* Left Column — Crisp White & Lime Accent on Studio Ink Card */}
              <div className="lg:col-span-6 flex flex-col gap-4 text-white">
                <div className="text-xs font-semibold tracking-wide text-white">
                  Branch {b.number}{" "}
                  <span className="text-white/45 font-normal">
                    of 0{BRANCHES.length}
                  </span>
                </div>

                <h2 className="font-display text-[clamp(3rem,6.5vw,5.2rem)] leading-[0.95] tracking-wide uppercase text-white">
                  {b.name}
                </h2>

                <div className="text-sm sm:text-base font-semibold text-[#E3EE32]">
                  {b.unit}
                </div>

                <div className="h-px w-full max-w-sm bg-white/10 my-1" />

                <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-md">
                  {b.description}
                </p>

                <div className="pt-2">
                  {b.external ? (
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E3EE32] hover:text-white transition"
                    >
                      {b.cta}
                    </a>
                  ) : (
                    <Link
                      to={b.href}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E3EE32] hover:text-white transition"
                    >
                      {b.cta}
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Column — Brand Purple (#792DFF / #9D6BFF) Feature Panel */}
              <div className={`lg:col-span-6 rounded-2xl p-7 sm:p-9 ${b.panelBg}`}>
                <h3 className={`text-lg sm:text-xl font-bold mb-4 ${b.panelTitleColor}`}>
                  {b.buildTitle}
                </h3>

                <div className={`divide-y border-t ${b.panelDivider}`}>
                  {b.build.map((item) => (
                    <div
                      key={item}
                      className={`py-4 text-sm font-medium leading-relaxed ${b.panelItemColor}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className={`pt-4 border-t ${b.panelDivider}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider ${b.fitLabelColor}`}>
                    Good fit for
                  </div>
                  <div className={`text-xs sm:text-sm font-medium mt-1 leading-relaxed ${b.fitTextColor}`}>
                    {b.fit}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
