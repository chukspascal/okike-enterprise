import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  Shield,
  Code2,
  Database,
  Calendar,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Testimonials } from "@/components/site/Testimonials";
import { getCourses, getTracks, getPhysicalClasses } from "@/lib/public-content";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "OKIKE Academy — Engineering & Design Cohorts" },
      {
        name: "description",
        content:
          "OKIKE Academy trains the architects of Africa's digital economy. Project-based cohorts in Fullstack Web, UI/UX Systems, Mobile Dev, Python & AI, and Cybersecurity.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "OKIKE Academy — Engineering & Design Cohorts" },
      {
        property: "og:description",
        content:
          "Master software engineering and product design through production-grade cohorts and direct mentorship.",
      },
    ],
    links: [{ rel: "canonical", href: "https://okike-enterprise.com/learn" }],
  }),
  component: LearnPage,
  loader: async () => {
    const [courses, tracks, physicalClasses] = await Promise.all([
      getCourses(),
      getTracks(),
      getPhysicalClasses(),
    ]);
    return { courses, tracks, physicalClasses };
  },
});

const CURRICULUM_HIGHLIGHTS = [
  {
    icon: Code2,
    track: "Fullstack Engineering",
    duration: "12 Weeks",
    description:
      "Modern TypeScript, React/Next.js, Node.js, PostgreSQL schema architecture, and cloud deployment.",
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "APIs"],
  },
  {
    icon: Sparkles,
    track: "UI/UX Systems Design",
    duration: "8 Weeks",
    description:
      "Atomic design tokens, high-fidelity micro-interactions, responsive frameworks, and design-to-code handoff.",
    skills: ["Figma", "Design Tokens", "Wireframing", "User Testing"],
  },
  {
    icon: Database,
    track: "Python, AI & Data Science",
    duration: "10 Weeks",
    description:
      "Applied Python, data pipelines, LLM agent integration, and automating business intelligence.",
    skills: ["Python", "FastAPI", "Pandas", "LLM APIs", "SQL"],
  },
  {
    icon: Shield,
    track: "Cybersecurity & Systems",
    duration: "10 Weeks",
    description:
      "Network fundamentals, penetration testing, defensive security, OWASP top 10, and identity compliance.",
    skills: ["Network Security", "OWASP", "Burp Suite", "Linux", "Auth"],
  },
];

function LearnPage() {
  const { courses } = Route.useLoaderData();

  return (
    <SiteLayout>
      {/* ─── HERO (FLAT STUDIO BLACK + #E3EE32 — NO GRADIENTS/BLURS) ─── */}
      <section className="relative overflow-hidden bg-[#0E0E0E] border-b border-white/10 py-20 md:py-28 px-6">
        <div className="relative max-w-6xl mx-auto">
          <div className="mb-6">
            <span className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-white/60">
              <span className="w-8 h-px bg-[#E3EE32]" />
              Branch 03 · OKIKE Academy
            </span>
          </div>

          <h1 className="font-display text-[clamp(3rem,7.5vw,6rem)] leading-[0.94] tracking-wide uppercase text-white max-w-4xl">
            Training the architects of the{" "}
            <span className="text-[#E3EE32]">digital economy.</span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-white/75 max-w-xl leading-relaxed">
            OKIKE Academy bridges the gap between raw ambition and production-grade engineering.
            Learn through real-world projects, daily challenge portals, and direct mentorship from
            practising architects.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/enroll"
              className="group bg-[#E3EE32] hover:bg-[#d4df28] text-[#0E0E0E] px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Enroll in a Cohort
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/bootcamp"
              className="bg-[#151514] hover:bg-[#1f1f1d] text-white border border-white/15 px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Computing Synergy Summit
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active Portal", value: "100+ Students" },
              { label: "Methodology", value: "Project-Based" },
              { label: "Format", value: "Online + Hubs" },
              { label: "Flagship Summit", value: "Aug 1, 2026" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[#151514] rounded-2xl border border-white/10 p-5"
              >
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E3EE32]">
                  {item.label}
                </div>
                <div className="text-xl font-bold text-white mt-1">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CURRICULUM TRACKS ─── */}
      <section className="py-24 px-6 bg-[#0E0E0E] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
                Tracks &amp; Specialisations
              </span>
              <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white mt-2">
                What you will master.
              </h2>
            </div>
            <p className="text-sm text-white/70 max-w-sm">
              We teach production engineering workflows: version control, code reviews, staging
              deployments, and systems architecture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {CURRICULUM_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.track}
                  className="p-8 rounded-2xl border border-white/10 bg-[#151514] hover:border-[#E3EE32] transition-colors flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="size-10 rounded-xl bg-[#E3EE32]/15 text-[#E3EE32] flex items-center justify-center">
                        <Icon className="size-5" />
                      </div>
                      <span className="font-mono text-xs font-semibold px-3 py-1 rounded-full bg-[#1a1a18] border border-white/10 text-[#E3EE32]">
                        {item.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-2">{item.track}</h3>
                    <p className="text-sm text-white/70 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                    {item.skills.map((s) => (
                      <span
                        key={s}
                        className="font-mono text-[11px] font-medium text-white/80 px-2.5 py-1 rounded-md bg-[#1a1a18] border border-white/10"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── LIVE COURSES FROM DATABASE ─── */}
      {courses.length > 0 && (
        <section className="py-24 px-6 bg-[#0E0E0E] border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
                  Available Enrollments
                </span>
                <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white mt-2">
                  Active Courses.
                </h2>
              </div>
              <Link
                to="/enroll"
                className="text-xs font-semibold uppercase tracking-wider text-[#0E0E0E] bg-[#E3EE32] hover:bg-[#d4df28] px-5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 self-start md:self-auto font-semibold"
              >
                All Courses <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {courses.slice(0, 6).map((course) => (
                <div
                  key={course.id}
                  className="bg-[#151514] rounded-2xl border border-white/10 p-6 flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E3EE32]">
                      {course.track}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-snug">{course.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-white/65 pt-2">
                      {course.duration && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3.5 text-[#E3EE32]" /> {course.duration}
                        </span>
                      )}
                      {course.instructor && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 text-[#E3EE32]" /> {course.instructor}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="font-mono font-bold text-sm text-white">
                      {course.price ? `₦${course.price.toLocaleString()}` : "Open"}
                    </div>
                    <Link
                      to="/enroll"
                      search={{ course: course.title }}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#E3EE32] hover:text-white transition"
                    >
                      Enroll <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── PHYSICAL HUBS & SUMMIT CARD ─── */}
      <section className="py-24 px-6 bg-[#0E0E0E] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-[#151514] border border-[#E3EE32]/40 p-7 sm:p-10 lg:p-12 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-4 text-white">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
                Hybrid Learning Experience
              </span>
              <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white">
                Online portal &amp; in-person hubs.
              </h2>
              <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                Alongside our interactive online student portal, we host lab sessions, live sprint
                reviews, and pair programming at partner regional hubs.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3 text-sm font-medium text-white">
                  <CheckCircle2 className="size-4 text-[#E3EE32] shrink-0" />
                  <span>Daily coding challenges &amp; live night sessions</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-white">
                  <CheckCircle2 className="size-4 text-[#E3EE32] shrink-0" />
                  <span>Weekly project critiques with practising engineers</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-white">
                  <CheckCircle2 className="size-4 text-[#E3EE32] shrink-0" />
                  <span>Direct talent pipeline into OKIKE Studio projects</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl bg-[#E3EE32] text-[#0E0E0E] p-7 sm:p-9 flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0E0E0E] text-[#E3EE32] font-mono text-xs font-semibold uppercase tracking-wider w-fit">
                <Calendar className="size-3.5" />
                <span>August 1, 2026</span>
              </div>
              <h3 className="text-2xl font-bold text-[#0E0E0E]">Computing Synergy Summit 2026</h3>
              <p className="text-sm text-[#0E0E0E]/85 leading-relaxed">
                Join 100+ students, senior engineers, and founders for intensive tracks in Web,
                UI/UX, Python, and Cybersecurity. Free admission for CS/IT department students.
              </p>
              <Link
                to="/bootcamp"
                className="bg-[#0E0E0E] hover:bg-black text-[#E3EE32] px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition text-center inline-flex items-center justify-center gap-1.5 w-fit"
              >
                Reserve Summit Pass <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />
    </SiteLayout>
  );
}
