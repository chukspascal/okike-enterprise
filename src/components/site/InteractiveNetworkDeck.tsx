import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { PublicPartner } from "@/lib/public-content";

interface PartnerMeta {
  role: string;
  location: string;
  tag: string;
  scope: string;
  metricLabel: string;
  metricValue: string;
}

const PARTNER_METADATA: Record<string, PartnerMeta> = {
  nacos: {
    role: "Student Body",
    location: "Akwa Ibom",
    tag: "Talent Pipeline",
    scope: "University computing chapter partnering on engineering bootcamps, technical workshops & developer mentorship.",
    metricLabel: "Community",
    metricValue: "500+ Student Engineers",
  },
  "coach ziri": {
    role: "Client Platform",
    location: "Lagos",
    tag: "EdTech & Coaching",
    scope: "Executive career coaching & assessment platform architected, engineered, and maintained by OKIKE Studio.",
    metricLabel: "Delivery",
    metricValue: "Full Production MVP",
  },
  krait: {
    role: "Venture Client",
    location: "Remote",
    tag: "Fintech & Security",
    scope: "High-throughput payment infrastructure and digital asset security workflows built for scale.",
    metricLabel: "Architecture",
    metricValue: "API & Core Security",
  },
  "mansfill ict": {
    role: "Enterprise Partner",
    location: "Lagos",
    tag: "Systems Integration",
    scope: "Corporate IT systems integration, hybrid infrastructure deployment, and enterprise technology services.",
    metricLabel: "Alliance",
    metricValue: "Enterprise Deployment",
  },
  datadom: {
    role: "Ecosystem Partner",
    location: "Remote",
    tag: "Data Intelligence",
    scope: "Data warehouse modeling, cloud analytics infrastructure, and business intelligence reporting pipelines.",
    metricLabel: "Integration",
    metricValue: "Real-time BI Pipelines",
  },
};

function getPartnerMeta(name: string): PartnerMeta {
  const key = name.toLowerCase().trim();
  if (PARTNER_METADATA[key]) return PARTNER_METADATA[key];
  for (const [k, v] of Object.entries(PARTNER_METADATA)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return {
    role: "Verified Partner",
    location: "Remote",
    tag: "Collaborator",
    scope: "Active organizational partner collaborating with OKIKE across software engineering and venture incubation.",
    metricLabel: "Network",
    metricValue: "Strategic Partner",
  };
}

export function InteractiveNetworkDeck({ partners }: { partners: PublicPartner[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mobileActiveIndex, setMobileActiveIndex] = useState<number>(-1);
  const total = partners.length;

  if (total === 0) return null;

  return (
    <div
      className="mt-20 pt-14 border-t border-black/10 dark:border-white/10"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {/* Header with Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#0e0e0e] dark:text-[#E3EE32]">
            Institutional Network
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#0e0e0e] dark:text-white mt-1 font-display">
            Collaborators, student bodies &amp; client partners.
          </h3>
        </div>

        {/* Location & Interactive State Hint */}
        <div className="flex items-center gap-3 text-xs font-mono text-black/50 dark:text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0e0e0e] dark:bg-[#E3EE32]" />
          <span>Akwa Ibom · Lagos · Remote</span>
          <span className="hidden sm:inline text-black/30 dark:text-white/30">|</span>
          <span className="hidden sm:inline text-black/70 dark:text-white/70">
            {hoveredIndex !== null
              ? `0${hoveredIndex + 1} / 0${total} Focused`
              : "Hover card to expand"}
          </span>
        </div>
      </div>

      {/* Desktop & Tablet: Slat Deck Expanding on Hover */}
      <div className="hidden md:flex items-stretch gap-3.5 w-full h-[430px] overflow-hidden select-none">
        {partners.map((p, idx) => {
          const isHovered = hoveredIndex === idx;
          const isAnyHovered = hoveredIndex !== null;
          const meta = getPartnerMeta(p.name);
          const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

          return (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredIndex(idx)}
              className={`relative cursor-pointer rounded-[28px] border transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden ${
                isHovered
                  ? "flex-[3.8] bg-white dark:bg-[#151514] border-black/30 dark:border-[#E3EE32] shadow-xl p-7 lg:p-8 z-10"
                  : isAnyHovered
                  ? "flex-[0.75] bg-white dark:bg-[#151514] border-black/10 dark:border-white/10 p-5 items-center justify-between opacity-75 hover:opacity-100 hover:border-black/25 dark:hover:border-white/30"
                  : "flex-1 bg-white dark:bg-[#151514] border-black/10 dark:border-white/10 p-5 flex flex-col items-center justify-between hover:border-black/30 dark:hover:border-white/30 shadow-xs"
              }`}
            >
              {isHovered ? (
                /* ─── EXPANDED DETAILED CARD (SHOWN ON HOVER) ─── */
                <div className="flex flex-col justify-between h-full w-full">
                  <div>
                    {/* Top Row: Logo, Title & Location */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-16 min-w-[72px] max-w-[160px] px-3.5 py-2 rounded-2xl bg-white border border-black/10 dark:border-white/20 flex items-center justify-center shrink-0 shadow-xs">
                          {p.logo_url ? (
                            <img
                              src={p.logo_url}
                              alt={p.name}
                              className="h-10 max-w-[130px] w-auto object-contain"
                            />
                          ) : (
                            <span className="font-mono font-bold text-sm text-[#0e0e0e]">
                              {p.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-[#E3EE32] block">
                            {meta.tag}
                          </span>
                          <h4 className="text-2xl font-bold font-display text-[#0e0e0e] dark:text-white leading-tight mt-0.5">
                            {p.name}
                          </h4>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 border border-black/10 dark:border-white/10 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0e0e0e] dark:bg-[#E3EE32]" />
                        {meta.location}
                      </span>
                    </div>

                    {/* Scope & Description */}
                    <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed max-w-xl mb-6">
                      {meta.scope}
                    </p>

                    {/* Meta stats / Role badges */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-black/40 dark:text-white/40 block">
                          Role
                        </span>
                        <span className="text-xs font-semibold text-[#0e0e0e] dark:text-white">
                          {meta.role}
                        </span>
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-black/40 dark:text-white/40 block">
                          Engagement
                        </span>
                        <span className="text-xs font-semibold text-[#0e0e0e] dark:text-white">
                          {meta.metricValue}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: External Link */}
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-black/45 dark:text-white/45">
                      Partner {numStr} of 0{total}
                    </span>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e0e0e] text-[#e3ee32] hover:bg-black dark:bg-[#E3EE32] dark:text-[#0e0e0e] dark:hover:bg-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        <span>Visit Platform</span>
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs font-mono uppercase text-black/40 dark:text-white/40">
                        Active Ecosystem Member
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* ─── INITIAL RESTING / INACTIVE SLAT CARD (MATCHES USER DESIGN) ─── */
                <div className="flex flex-col items-center justify-between h-full w-full py-2">
                  {/* Top: Circular / Squircle Logo Housing */}
                  <div className="h-16 w-16 rounded-[22px] bg-white border border-black/[0.08] dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center p-3 shrink-0">
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt={p.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="font-mono font-bold text-xs text-[#0e0e0e]">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Center: Vertical Partner Name */}
                  <div className="flex-1 flex items-center justify-center my-6 overflow-hidden">
                    <span
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      className="font-display font-bold text-xs uppercase tracking-[0.2em] text-[#0e0e0e]/75 dark:text-white/70 whitespace-nowrap"
                    >
                      {p.name}
                    </span>
                  </div>

                  {/* Bottom: Monospace 2-digit number */}
                  <span className="font-mono text-xs text-black/40 dark:text-white/40 tracking-wider">
                    {numStr}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile (< md): Touch-Friendly Accordion Cards */}
      <div className="md:hidden flex flex-col gap-3">
        {partners.map((p, idx) => {
          const isExpanded = mobileActiveIndex === idx;
          const meta = getPartnerMeta(p.name);
          const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

          return (
            <div
              key={p.id}
              onClick={() => setMobileActiveIndex(isExpanded ? -1 : idx)}
              className={`rounded-[22px] border transition-all duration-300 p-5 ${
                isExpanded
                  ? "bg-white dark:bg-[#151514] border-black/25 dark:border-[#E3EE32] shadow-md"
                  : "bg-white dark:bg-[#151514] border-black/10 dark:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-[18px] bg-white border border-black/10 shadow-xs flex items-center justify-center p-2 shrink-0">
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt={p.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="font-mono font-bold text-xs text-[#0e0e0e]">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40 mr-1.5">
                      {numStr}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-[#E3EE32]">
                      {meta.tag}
                    </span>
                    <h4 className="text-base font-bold font-display text-[#0e0e0e] dark:text-white">
                      {p.name}
                    </h4>
                  </div>
                </div>

                <span className="text-xs font-mono text-black/50 dark:text-white/50">
                  {isExpanded ? "−" : "+"}
                </span>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                  <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed mb-4">
                    {meta.scope}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-black/50 dark:text-white/50">
                      {meta.role} · {meta.location}
                    </span>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e0e0e] text-[#e3ee32] dark:bg-[#E3EE32] dark:text-[#0e0e0e] text-xs font-bold uppercase tracking-wider"
                      >
                        <span>Visit</span>
                        <ArrowUpRight className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
