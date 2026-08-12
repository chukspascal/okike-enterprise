import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import founderImg from "@/assets/founder.jpg";
import { UserCheck, Mail, Award, Code2, Compass, GraduationCap, ArrowUpRight, TrendingUp, Briefcase, Coins, Globe, Layers, Milestone as MilestoneIcon } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OKIKE — Nigerian Software Studio & Tech Academy" },
      {
        name: "description",
        content:
          "OKIKE is a founder-led Nigerian software house and tech academy. We build world-class digital products and train the next generation of African engineers. Founded in 2023.",
      },
      { name: "robots", content: "index, follow" },
      { name: "keywords", content: "about OKIKE, Nigerian software studio, tech academy Africa, African engineers, software house Nigeria, OKIKE founder" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://okike-enterprise.com/about" },
      { property: "og:title", content: "About OKIKE — Nigerian Software Studio & Tech Academy" },
      { property: "og:description", content: "OKIKE is a founder-led Nigerian software house and academy. We build for ambitious teams and train the engineers behind the next decade of African tech." },
      { property: "og:image", content: "https://okike-enterprise.com/background.png" },
      { property: "og:site_name", content: "OKIKE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About OKIKE — Nigerian Software Studio & Tech Academy" },
      { name: "twitter:description", content: "Founder story and mission behind OKIKE — built in Africa, engineered for the world." },
      { name: "twitter:image", content: "https://okike-enterprise.com/background.png" },
    ],
    links: [
      { rel: "canonical", href: "https://okike-enterprise.com/about" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      {/* 1. Editorial Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-16 px-6 border-b border-ink/10 bg-contrast overflow-hidden">
        {/* Abstract background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.25em] uppercase text-brand mb-8">
            <span className="h-px w-8 bg-brand" />
            <span>Vol. 01 — Executive Overview</span>
          </div>

          <h1 className="font-display text-[clamp(2.5rem,7.5vw,5.5rem)] leading-[0.95] tracking-tight uppercase text-contrast-foreground max-w-5xl font-extrabold">
            Built in Africa. <br />
            <span className="text-brand italic">Engineered</span> for the world.
          </h1>

          <p className="text-base md:text-xl text-contrast-foreground/75 max-w-[48ch] leading-relaxed mt-6 font-medium">
            OKIKE is a founder-led software studio and tech academy bridging the gap between world-class engineering and African builders.
          </p>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-contrast-foreground/10 border border-contrast-foreground/10 mt-16 rounded-xl overflow-hidden">
            {[
              { value: "2023", label: "Founded", desc: "Enugu, Nigeria" },
              { value: "100%", label: "Senior Led", desc: "Direct expert oversight" },
              { value: "15+", label: "Products Shipped", desc: "Scalable apps globally" },
              { value: "12 Wks", label: "Academy Track", desc: "Production readiness" },
            ].map(({ value, label, desc }) => (
              <div key={label} className="bg-contrast/95 p-6 md:p-8 flex flex-col gap-1 hover:bg-contrast/70 transition-colors">
                <span className="font-display text-3xl md:text-4xl font-extrabold tracking-wide uppercase text-brand">{value}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-contrast-foreground">{label}</span>
                <span className="text-xs text-contrast-foreground/50">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Founder Letter Section */}
      <section className="px-6 py-24 bg-surface/20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-16 items-start">
          
          {/* Framed Image Column */}
          <aside className="md:col-span-5 md:sticky md:top-28 flex flex-col gap-6">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-brand to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
              <div className="relative bg-surface border border-ink/10 rounded-2xl p-3 shadow-lg">
                <img
                  src={founderImg}
                  alt="Founder of OKIKE"
                  loading="lazy"
                  className="w-full aspect-[4/5] object-cover rounded-xl grayscale hover:grayscale-0 transition duration-500"
                />
                
                {/* Float Badge */}
                <div className="absolute bottom-6 right-6 bg-brand text-brand-foreground px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <UserCheck className="size-4" /> Founder Story
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-ink">Anas & Team</span>
                <span className="text-[10px] text-ink/40 uppercase tracking-widest font-medium">Head of Practice</span>
              </div>
              <a 
                href="mailto:support@okikeenterprises.com"
                className="text-xs font-bold text-brand uppercase tracking-wider inline-flex items-center gap-1.5 hover:underline"
              >
                <Mail className="size-3.5" /> Get in Touch
              </a>
            </div>
          </aside>

          {/* Letter Body Column */}
          <article className="md:col-span-7 flex flex-col gap-8 text-ink/85">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-brand">
              <span className="h-px w-5 bg-brand" />
              <span>A Letter From the Founder</span>
            </div>

            <h2 className="font-display text-3xl md:text-4xl font-extrabold uppercase tracking-wide text-ink leading-tight">
              Bridging the gap between code quality and raw ambition.
            </h2>

            <div className="space-y-6 text-sm md:text-base leading-relaxed text-ink/80">
              <p className="first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-brand first-letter:font-display">
                I started OKIKE because I kept seeing the same persistent pattern in African tech: brilliant developers without the infrastructure or mentorship to build enterprise-grade systems, and ambitious teams paying for outsourced software that failed to scale.
              </p>
              <p>
                By day, we function as a high-integrity software studio, designing secure APIs, robust databases, and beautiful client-side web and mobile apps for partners. By night and weekend, we run our intensive academy cohorts, utilizing the exact same stack we write for enterprise clients.
              </p>
              <div className="p-6 bg-brand/5 border-l-4 border-brand rounded-r-xl my-4">
                <p className="italic text-lg text-ink font-medium leading-relaxed">
                  "We keep our cohorts and project load small on purpose. Every client gets senior engineering oversight. Every student gets real code reviews. Quality isn't a promise — it's the only asset that compounds."
                </p>
              </div>
              <p>
                Whether you're looking to hire our software studio to build your next product, or ready to challenge yourself in our academy tracks, our mission is identical: to build software that lasts, and train the talent that will power the next decade of digital growth.
              </p>
            </div>

            <div className="pt-6 border-t border-ink/10 flex flex-col gap-1">
              <span className="italic text-lg text-brand font-bold">— Founder & Lead Builder</span>
              <span className="text-xs text-ink/50">OKIKE Enterprises</span>
            </div>
          </article>

        </div>
      </section>

      {/* 3. Principles Section */}
      <section className="py-24 bg-surface border-y border-ink/10 px-6 relative">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-start">
          <header className="md:col-span-4 lg:sticky lg:top-28">
            <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand mb-6">
              <span className="h-px w-8 bg-brand" />
              <span>Core Beliefs</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-wide uppercase text-ink font-extrabold mb-4">
              How we work & teach.
            </h2>
            <p className="text-xs md:text-sm text-ink/65 leading-relaxed">
              These three foundational rules govern every line of code we write for clients and every curriculum roadmap we plan for students.
            </p>
          </header>

          <div className="md:col-span-8 grid sm:grid-cols-1 gap-4">
            {[
              {
                icon: <Award className="size-6" />,
                num: "01",
                title: "Quality Compounds",
                desc: "Hasty work has to be done twice. We dedicate the extra hours to write normalized database schemas, implement Row Level Security, and configure type-safety upfront."
              },
              {
                icon: <Code2 className="size-6" />,
                num: "02",
                title: "Ship What You Teach",
                desc: "We do not teach abstract toy examples. The stack we teach in our academy (Vite, React, Next.js, Supabase, PostgreSQL) is the exact stack we ship to enterprise clients."
              },
              {
                icon: <Compass className="size-6" />,
                num: "03",
                title: "People Over Platforms",
                desc: "Platforms and libraries change, but clean engineering principles remain. We focus on teaching algorithmic logic, database modeling, and team collaboration over raw code syntax."
              }
            ].map((p, i) => (
              <div 
                key={p.num}
                className="bg-card border border-ink/10 hover:border-brand/45 rounded-2xl p-6 md:p-8 flex gap-6 items-start transition duration-300 group hover:shadow-md"
              >
                <span className="text-xl font-display font-bold text-brand bg-brand/10 size-10 rounded-lg flex items-center justify-center shrink-0">
                  {p.num}
                </span>
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-bold uppercase tracking-wide text-ink flex items-center gap-2">
                    {p.title}
                  </h3>
                  <p className="text-xs md:text-sm text-ink/65 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Pillars / Practices */}
      <section className="px-6 py-24 bg-surface/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand mb-6">
            <span className="h-px w-8 bg-brand" />
            <span>Dual Model Structure</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-wide uppercase text-ink font-extrabold mb-12 max-w-2xl">
            Two practices. One unified mission.
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Studio Pillar */}
            <div className="bg-card border border-ink/10 hover:border-brand/35 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 group hover:shadow-lg">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand bg-brand/10 px-3 py-1 rounded">STUDIO PRACTICE</span>
                  <Code2 className="size-5 text-ink/40 group-hover:text-brand transition-colors" />
                </div>
                <h3 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink">Software house</h3>
                <p className="text-xs md:text-sm text-ink/70 leading-relaxed">
                  We design, build, and deploy production-ready web and mobile applications for ambitious organizations. Fixed timelines, clear budgets, and direct access to senior builders.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["Next.js", "React Native", "PostgreSQL", "Cloud Architecture"].map((t) => (
                    <span key={t} className="text-[10px] font-bold text-ink/50 uppercase bg-surface border border-ink/10 px-2.5 py-1 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to="/book"
                className="mt-8 inline-flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-widest hover:gap-2.5 transition-all"
              >
                Hire the Studio <ArrowUpRight className="size-4" />
              </Link>
            </div>

            {/* Academy Pillar */}
            <div className="bg-card border border-ink/10 hover:border-brand/35 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 group hover:shadow-lg">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand bg-brand/10 px-3 py-1 rounded">ACADEMY PRACTICE</span>
                  <GraduationCap className="size-5 text-ink/40 group-hover:text-brand transition-colors" />
                </div>
                <h3 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink">Tech Academy</h3>
                <p className="text-xs md:text-sm text-ink/70 leading-relaxed">
                  Structured career track cohorts taking builders from fundamentals to production-ready developers. Real database schema design, APIs, security compliance, and direct developer mentors.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["Frontend Dev", "Backend Dev", "UI/UX Design", "Cyber Security"].map((t) => (
                    <span key={t} className="text-[10px] font-bold text-ink/50 uppercase bg-surface border border-ink/10 px-2.5 py-1 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to="/bootcamp"
                className="mt-8 inline-flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-widest hover:gap-2.5 transition-all"
              >
                Explore Cohorts <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Company Timeline Section */}
      <section className="px-6 py-24 bg-contrast text-contrast-foreground relative overflow-hidden">
        {/* Background mesh glow details */}
        <div className="absolute bottom-0 right-0 size-[400px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand mb-6">
            <span className="h-px w-8 bg-brand" />
            <span>Our Journey</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-wide uppercase text-contrast-foreground font-extrabold mb-16">
            From a single project to an enterprise studio.
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { year: "2023", title: "OKIKE Founded", desc: "First client contracts signed. Core team assembled in Enugu." },
              { year: "2024", title: "Academy Launch", desc: "First software engineering cohort registers and ships capstone systems." },
              { year: "2025", title: "SaaS Scale", desc: "Architected cross-border applications, introducing new specialization tracks." },
              { year: "2026", title: "Enterprise Summit", desc: "Hosting the Computing Synergy Summit, training over 100+ new developers." }
            ].map((item, idx) => (
              <div 
                key={item.year}
                className="bg-contrast-foreground/5 border border-contrast-foreground/10 hover:border-brand/40 p-6 rounded-2xl space-y-4 hover:-translate-y-1 transition duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-extrabold text-brand bg-brand/10 px-2 py-0.5 rounded">
                    {item.year}
                  </span>
                  <MilestoneIcon className="size-4 text-contrast-foreground/20 group-hover:text-brand transition-colors" />
                </div>
                <h4 className="font-display text-sm font-bold uppercase tracking-wider text-contrast-foreground">
                  {item.title}
                </h4>
                <p className="text-xs text-contrast-foreground/60 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Professional Call To Action */}
      <section className="py-24 px-6 border-t border-ink/10 relative">
        <div className="max-w-7xl mx-auto text-center max-w-3xl">
          <div className="flex items-center justify-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand mb-8">
            <span className="h-px w-8 bg-brand" />
            <span>Connect with OKIKE</span>
            <span className="h-px w-8 bg-brand" />
          </div>

          <h2 className="font-display text-4xl md:text-6xl leading-[0.95] tracking-tight uppercase text-ink font-extrabold mb-8">
            Let's build something <span className="text-brand italic">extraordinary</span> together.
          </h2>

          <p className="text-xs md:text-base text-ink/65 leading-relaxed mb-10 max-w-[50ch] mx-auto">
            Partner with our software studio to bring your digital vision to life, or join our next academy cohort to master the engineering craft.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/book"
              className="bg-brand text-brand-foreground px-8 py-4 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition rounded-lg shadow-md flex items-center gap-2"
            >
              Start a project <ArrowUpRight className="size-4" />
            </Link>
            <Link
              to="/bootcamp"
              className="bg-transparent text-ink px-8 py-4 font-bold text-xs uppercase tracking-widest ring-1 ring-ink/20 hover:ring-ink/40 transition rounded-lg"
            >
              Apply to Academy
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
