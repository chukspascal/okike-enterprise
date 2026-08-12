import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import founderImg from "@/assets/founder.jpg";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserCheck, 
  Mail, 
  Award, 
  Code2, 
  Compass, 
  GraduationCap, 
  ArrowUpRight, 
  Milestone as MilestoneIcon, 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Server, 
  Cpu, 
  Database, 
  Laptop, 
  ArrowRight,
  Sparkles,
  Users,
  Github,
  Linkedin
} from "lucide-react";

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
      { property: "og:description", content: "OKIKE is a founder-led software studio and academy. We build for ambitious teams and train the engineers behind the next decade of African tech." },
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
  const [activeSlide, setActiveSlide] = useState(0);

  // Dynamic States loaded from Supabase site_settings / team_members
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [founderInfo, setFounderInfo] = useState<{
    founder_name: string;
    founder_title: string;
    founder_quote: string;
    founder_letter_p1: string;
    founder_letter_p2: string;
    founder_letter_p3: string;
  } | null>(null);
  const [timelineMilestones, setTimelineMilestones] = useState<any[] | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch team members
        const { data: dbTeam } = await supabase
          .from("team_members")
          .select("id, name, role, bio, image_url, skills, github, linkedin")
          .eq("published", true)
          .order("position", { ascending: true });
        if (dbTeam && dbTeam.length > 0) {
          setTeamMembers(dbTeam);
        }

        // 2. Fetch settings for founder & timeline
        const { data: dbSettings } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["about_founder_story", "about_timeline"]);
        
        if (dbSettings) {
          const settingsMap: Record<string, any> = {};
          dbSettings.forEach((row) => {
            settingsMap[row.key] = row.value;
          });

          if (settingsMap["about_founder_story"]) {
            setFounderInfo(settingsMap["about_founder_story"]);
          }

          if (settingsMap["about_timeline"] && settingsMap["about_timeline"].milestones_json) {
            try {
              const parsed = JSON.parse(settingsMap["about_timeline"].milestones_json);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setTimelineMilestones(parsed);
              }
            } catch (e) {
              console.error("Error parsing timeline milestones JSON:", e);
            }
          }
        }
      } catch (err) {
        console.error("Error loading dynamic content:", err);
      }
    }
    loadData();
  }, []);

  const slides = [
    {
      title: "Enterprise Software Studio",
      subtitle: "STUDIO PRACTICE",
      desc: "We design, build, and deploy production-ready web and mobile applications for ambitious organizations. We guarantee fixed timelines, clear budgets, and direct access to senior engineers.",
      techs: ["Next.js", "React Native", "PostgreSQL", "Cloud Architecture"],
      ctaText: "Hire the Studio",
      ctaLink: "/book",
      icon: <Code2 className="size-6 text-brand" />,
      color: "from-blue-500/10 to-indigo-500/10",
      textColor: "text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-200"
    },
    {
      title: "High-Integrity Tech Academy",
      subtitle: "ACADEMY PRACTICE",
      desc: "Structured career track cohorts taking builders from fundamentals to production-ready software engineers. We focus on real database schema design, APIs, security compliance, and direct developer mentorship.",
      techs: ["Frontend Dev", "Backend Dev", "UI/UX Design", "Cyber Security"],
      ctaText: "Explore Cohorts",
      ctaLink: "/bootcamp",
      icon: <GraduationCap className="size-6 text-brand" />,
      color: "from-emerald-500/10 to-teal-500/10",
      textColor: "text-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-200"
    },
    {
      title: "Open Source & Regional Growth",
      subtitle: "COMMUNITY PRACTICE",
      desc: "We believe in building public digital infrastructure. Through open-source utilities, developer meetups, and active WhatsApp community networks, we support the wider African tech ecosystem.",
      techs: ["Open Source", "Community Outreach", "Developer Forums", "Tech Meetups"],
      ctaText: "Join the Community",
      ctaLink: "https://chat.whatsapp.com/GLemXx2uWn5F6Nm40ihiD7",
      icon: <Globe className="size-6 text-brand" />,
      color: "from-amber-500/10 to-orange-500/10",
      textColor: "text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200"
    }
  ];

  // Static Fallback Core Team (Default)
  const defaultTeam = [
    {
      name: "Anas",
      role: "Founder & Lead Architect",
      bio: "Systems architect and engineer with 8+ years designing high-throughput web APIs, custom database schemas, and robust Cloudflare network operations.",
      avatar: founderImg,
      initials: "A",
      skills: ["Architect", "Backend", "SecOps"],
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    },
    {
      name: "Chioma",
      role: "Lead UI/UX Designer",
      bio: "Detail-oriented product designer crafting modern, high-fidelity design systems, premium web micro-interactions, and accessible mobile layouts.",
      avatar: null,
      initials: "C",
      skills: ["Figma", "Design Systems", "UI/UX"],
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    },
    {
      name: "Eze",
      role: "Senior Backend Engineer",
      bio: "Database administrator and server specialist focused on low-latency microservices, secure transaction endpoints, and Supabase cloud integrations.",
      avatar: null,
      initials: "E",
      skills: ["Postgres", "Node.js", "APIs"],
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    },
    {
      name: "Kene",
      role: "DevOps & Academy Mentor",
      bio: "Cloud operations engineer managing automated build pipelines, containerized deployments, and running high-integrity bootcamp cohorts.",
      avatar: null,
      initials: "K",
      skills: ["Docker", "CI/CD", "Mentorship"],
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    }
  ];

  const activeTeam = teamMembers.length > 0 ? teamMembers : defaultTeam;

  // Static Fallback Founder Letter
  const activeFounder = founderInfo || {
    founder_name: "Anas & Team",
    founder_title: "Founder & Lead Builder",
    founder_quote: `"We keep our cohorts and project load small on purpose. Every client gets senior engineering oversight. Every student gets real code reviews. Quality isn't a promise — it's the only asset that compounds."`,
    founder_letter_p1: "I started OKIKE because I kept seeing the same persistent pattern in African tech: brilliant developers without the infrastructure or mentorship to build enterprise-grade systems, and ambitious teams paying for outsourced software that failed to scale.",
    founder_letter_p2: "By day, we function as a high-integrity software studio, designing secure APIs, robust databases, and beautiful client-side web and mobile apps for partners. By night and weekend, we run our intensive academy cohorts, utilizing the exact same stack we write for enterprise clients.",
    founder_letter_p3: "Whether you're looking to hire our software studio to build your next product, or ready to challenge yourself in our academy tracks, our mission is identical: to build software that lasts, and train the talent that will power the next decade of digital growth."
  };

  // Static Fallback Journey Timeline
  const activeTimeline = timelineMilestones || [
    { year: "2023", title: "OKIKE Founded", desc: "First client contracts signed. Core team assembled in Enugu." },
    { year: "2024", title: "Academy Launch", desc: "First software engineering cohort registers and ships capstone systems." },
    { year: "2025", title: "SaaS Scale", desc: "Architected cross-border applications, introducing new specialization tracks." },
    { year: "2026", title: "Enterprise Summit", desc: "Hosting the Computing Synergy Summit, training over 100+ new developers." }
  ];

  return (
    <SiteLayout>
      {/* 1. SaaS Hero & Overview */}
      <section className="relative pt-20 md:pt-28 pb-16 px-6 border-b border-ink/10 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-ink/50">
              <span className="h-px w-8 bg-brand" />
              <span>Vol. 01 — Executive Overview</span>
            </div>

            <h1 className="font-display text-[clamp(3.5rem,9vw,7.5rem)] leading-[0.92] tracking-wide uppercase text-ink">
              Built in Africa. <br />
              <span className="text-brand">Engineered</span> for the world.
            </h1>

            <p className="text-base md:text-lg text-ink/65 max-w-[48ch] leading-relaxed">
              OKIKE is a founder-led software studio and tech academy bridging the gap between world-class engineering and ambitious African builders.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/book"
                className="group bg-brand text-brand-foreground py-3.5 pl-7 pr-5 inline-flex items-center gap-2 font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition"
              >
                Hire our Studio <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/bootcamp"
                className="group ring-1 ring-ink/10 py-3.5 px-6 inline-flex items-center gap-2 font-semibold text-sm uppercase tracking-widest hover:bg-ink/5 transition"
              >
                Join our Academy
              </Link>
            </div>
          </div>

          {/* SaaS Floating Stats Box */}
          <div className="lg:col-span-5 bg-card border border-ink/10 p-8 backdrop-blur-md relative overflow-hidden group">
            <h2 className="font-display text-xl font-bold uppercase text-ink tracking-wider mb-6 flex items-center gap-2">
              <Award className="text-brand size-5" /> OKIKE By The Numbers
            </h2>
            
            <div className="grid grid-cols-2 gap-6 divide-x divide-y divide-ink/10">
              <div className="pb-4 pr-4">
                <span className="font-display text-4xl font-extrabold text-brand block">2023</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Founded</span>
                <span className="text-xs text-ink/45 block">Enugu, Nigeria</span>
              </div>
              <div className="pl-6 pb-4">
                <span className="font-display text-4xl font-extrabold text-brand block">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Senior Led</span>
                <span className="text-xs text-ink/45 block">Direct expert oversight</span>
              </div>
              <div className="pt-6 pr-4">
                <span className="font-display text-4xl font-extrabold text-brand block">15+</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Products Shipped</span>
                <span className="text-xs text-ink/45 block">Scalable apps globally</span>
              </div>
              <div className="pl-6 pt-6">
                <span className="font-display text-4xl font-extrabold text-brand block">100+</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Developers Trained</span>
                <span className="text-xs text-ink/45 block">Production ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Practices Carousel */}
      <section className="py-24 px-6 border-b border-ink/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-ink/50 mb-4">
                <span className="h-px w-8 bg-brand" />
                <span>Dual Practice Structure</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-wide uppercase text-ink font-extrabold">
                Two practices. One unified mission.
              </h2>
            </div>
            <p className="text-xs md:text-sm text-ink/60 max-w-md leading-relaxed">
              We apply the exact same technologies we build for enterprise clients in our academy curriculum. Cycle through our core areas of operations below.
            </p>
          </div>

          {/* Carousel Widget */}
          <div className="relative bg-card border border-ink/10 p-8 md:p-12 overflow-hidden shadow-xl ring-1 ring-ink/5">
            <div className="min-h-[260px] flex flex-col justify-between">
              {/* Active Slide Content */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 ${slides[activeSlide].textColor}`}>
                    {slides[activeSlide].subtitle}
                  </span>
                  <div className="p-2.5 bg-brand/10">
                    {slides[activeSlide].icon}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-display text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-ink">
                    {slides[activeSlide].title}
                  </h3>
                  <p className="text-xs md:text-sm text-ink/70 leading-relaxed max-w-3xl">
                    {slides[activeSlide].desc}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {slides[activeSlide].techs.map((t) => (
                    <span key={t} className="text-[10px] font-bold text-ink/50 uppercase bg-surface border border-ink/10 px-2.5 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Slide controls footer */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mt-12 pt-6 border-t border-ink/5">
                {slides[activeSlide].ctaLink.startsWith("http") ? (
                  <a
                    href={slides[activeSlide].ctaLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-widest hover:gap-2.5 transition-all"
                  >
                    {slides[activeSlide].ctaText} <ArrowUpRight className="size-4" />
                  </a>
                ) : (
                  <Link
                    to={slides[activeSlide].ctaLink as any}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-widest hover:gap-2.5 transition-all"
                  >
                    {slides[activeSlide].ctaText} <ArrowUpRight className="size-4" />
                  </Link>
                )}

                {/* Dots & Nav */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                  <div className="flex gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className={`size-2.5 transition-all duration-300 ${i === activeSlide ? "bg-brand w-6" : "bg-ink/20 hover:bg-ink/40"}`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                      className="p-2 bg-surface hover:bg-ink/5 ring-1 ring-ink/10 transition"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                      className="p-2 bg-surface hover:bg-ink/5 ring-1 ring-ink/10 transition"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Founder Story */}
      <section className="px-6 py-24 border-b border-ink/10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-16 items-start">
          
          {/* Framed Image Column */}
          <aside className="md:col-span-5 md:sticky md:top-28 flex flex-col gap-6">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-brand to-yellow-500 blur opacity-25 group-hover:opacity-40 transition duration-500" />
              <div className="relative bg-surface border border-ink/10 p-3 shadow-lg">
                <img
                  src={founderImg}
                  alt="Founder of OKIKE"
                  loading="lazy"
                  className="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition duration-500"
                />
                
                {/* Float Badge */}
                <div className="absolute bottom-6 right-6 bg-brand text-brand-foreground px-4 py-2 shadow-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <UserCheck className="size-4" /> Founder Story
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-ink">{activeFounder.founder_name}</span>
                <span className="text-[10px] text-ink/40 uppercase tracking-widest font-medium">{activeFounder.founder_title}</span>
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

            <div className="space-y-6 text-xs md:text-sm leading-relaxed text-ink/80">
              {activeFounder.founder_letter_p1 && (
                <p className="first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-brand first-letter:font-display">
                  {activeFounder.founder_letter_p1}
                </p>
              )}
              {activeFounder.founder_letter_p2 && (
                <p>{activeFounder.founder_letter_p2}</p>
              )}
              {activeFounder.founder_quote && (
                <div className="p-6 bg-brand/5 border-l-4 border-brand my-4">
                  <p className="italic text-lg text-ink font-medium leading-relaxed">
                    {activeFounder.founder_quote}
                  </p>
                </div>
              )}
              {activeFounder.founder_letter_p3 && (
                <p>{activeFounder.founder_letter_p3}</p>
              )}
            </div>

            <div className="pt-6 border-t border-ink/10 flex flex-col gap-1">
              <span className="italic text-lg text-brand font-bold">— {activeFounder.founder_name}</span>
              <span className="text-xs text-ink/50">OKIKE Enterprises</span>
            </div>
          </article>
        </div>
      </section>

      {/* 4. Core Team Grid */}
      <section className="py-24 border-b border-ink/10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center justify-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand">
              <span className="h-px w-5 bg-brand" />
              <span>Meet The Builders</span>
              <span className="h-px w-5 bg-brand" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-ink font-extrabold">
              Our Core Team
            </h2>
            <p className="text-xs md:text-sm text-ink/65 leading-relaxed">
              We are a tight-knit collective of designers, senior engineers, and mentors who write production systems and review every line of code.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeTeam.map((member, idx) => (
              <TeamMemberCard key={member.id || member.name || idx} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. SaaS Technology Stack Showcase */}
      <section className="py-24 border-b border-ink/10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center justify-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand">
              <span className="h-px w-5 bg-brand" />
              <span>Technology Stack</span>
              <span className="h-px w-5 bg-brand" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-ink font-extrabold">
              Modern SaaS Stack
            </h2>
            <p className="text-xs md:text-sm text-ink/65 leading-relaxed">
              We select standard, production-ready libraries and databases that scale. No toys. No half-measures.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Laptop className="size-6 text-brand" />,
                title: "Frontend Core",
                items: ["React", "Next.js", "Vite", "Tailwind CSS", "TanStack Router"]
              },
              {
                icon: <Database className="size-6 text-brand" />,
                title: "Backend & Database",
                items: ["PostgreSQL", "Supabase DB", "Node.js", "REST / GraphQL APIs"]
              },
              {
                icon: <Server className="size-6 text-brand" />,
                title: "Operations & Cloud",
                items: ["Cloudflare Workers", "GitHub Actions", "Docker Containers", "S3 Storage Sync"]
              }
            ].map((stack) => (
              <div key={stack.title} className="bg-card border border-ink/10 p-6 hover:border-brand/40 transition duration-300">
                <div className="p-3 bg-brand/10 inline-block mb-4">
                  {stack.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-ink uppercase tracking-wide mb-4">
                  {stack.title}
                </h3>
                <ul className="space-y-2.5 text-xs text-ink/70">
                  {stack.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="size-1.5 bg-brand animate-pulse" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Company Timeline Section */}
      <section className="px-6 py-24 bg-surface/10 border-b border-ink/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-brand mb-6">
            <span className="h-px w-8 bg-brand" />
            <span>Our Journey</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-wide uppercase text-ink font-extrabold mb-16">
            From a single project to an enterprise studio.
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {activeTimeline.map((item, idx) => (
              <div 
                key={item.year || idx}
                className="bg-card border border-ink/10 hover:border-brand/40 p-6 space-y-4 hover:-translate-y-1 transition duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-extrabold text-brand bg-brand/10 px-2 py-0.5">
                    {item.year}
                  </span>
                  <MilestoneIcon className="size-4 text-ink/20 group-hover:text-brand transition-colors" />
                </div>
                <h4 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                  {item.title}
                </h4>
                <p className="text-xs text-ink/60 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Professional Call To Action */}
      <section className="py-24 px-6 relative">
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
              className="bg-brand text-brand-foreground px-8 py-4 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition flex items-center gap-2 shadow-md"
            >
              Start a project <ArrowUpRight className="size-4" />
            </Link>
            <Link
              to="/bootcamp"
              className="bg-transparent text-ink px-8 py-4 font-bold text-xs uppercase tracking-widest ring-1 ring-ink/20 hover:ring-ink/40 transition"
            >
              Apply to Academy
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

// ─── Helper UI Components ───────────────────────────────────────────────────

function TeamMemberCard({ member }: { member: any }) {
  const name = member.name;
  const role = member.role;
  const bio = member.bio;
  const avatar = member.avatar || member.image_url;
  const initials = member.initials || (name ? name.charAt(0) : "?");
  const skills = Array.isArray(member.skills) 
    ? member.skills 
    : (typeof member.skills === "string" ? (member.skills as string).split(",").map((s: string) => s.trim()) : []);
  const github = member.github || "#";
  const linkedin = member.linkedin || "#";

  return (
    <div className="bg-card border border-ink/10 hover:border-brand/40 p-6 flex flex-col justify-between transition-all duration-300 group hover:shadow-lg relative min-h-[380px]">
      <div className="space-y-4">
        {/* Avatar / Photo */}
        <div className="relative w-20 h-20 overflow-hidden border border-ink/10 bg-surface">
          {avatar ? (
            <img 
              src={avatar} 
              alt={name} 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-tr from-brand/20 to-brand/5 flex items-center justify-center font-display text-2xl font-bold text-brand uppercase`}>
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1">
          <h4 className="font-display text-base font-bold text-ink uppercase tracking-wide">{name}</h4>
          <p className="text-[10px] text-brand font-extrabold uppercase tracking-wider">{role}</p>
        </div>

        {/* Bio */}
        <p className="text-xs text-ink/70 leading-relaxed font-light">
          {bio}
        </p>

        {/* Skill Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {skills.map((s: string) => (
            <span key={s} className="text-[8px] font-bold text-ink/50 uppercase border border-ink/10 px-2 py-0.5">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Social Links Footer */}
      <div className="flex items-center gap-3 pt-4 mt-4 border-t border-ink/5">
        <a 
          href={github} 
          target="_blank"
          rel="noreferrer"
          className="text-ink/40 hover:text-brand transition" 
          aria-label={`${name} on GitHub`}
        >
          <Github className="size-4" />
        </a>
        <a 
          href={linkedin} 
          target="_blank"
          rel="noreferrer"
          className="text-ink/40 hover:text-brand transition" 
          aria-label={`${name} on LinkedIn`}
        >
          <Linkedin className="size-4" />
        </a>
        <a 
          href={`mailto:support@okikeenterprises.com`} 
          className="text-ink/40 hover:text-brand transition" 
          aria-label={`Email ${name}`}
        >
          <Mail className="size-4" />
        </a>
      </div>
    </div>
  );
}
