import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant, generateInsights, getAiConversations, saveAiMessage } from "@/lib/ai-assistant.functions";
import { savePushSubscription } from "@/lib/push.functions";
import { toast } from "sonner";
import { verifyProjectDeposit, verifyBootcampPayment, updateBootcampPaymentReference, sendPasswordChangedEmail } from "@/lib/forms.functions";
import { getBootcampCoursePrice } from "@/lib/utils";
import heroImg from "@/assets/dashboard-hero.jpg";
import heroImgLight from "@/assets/dashboard-hero-light.png";
import okikeLogo from "@/assets/okike-logo.png";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  MessageSquare,
  FileText,
  Calendar,
  Flag,
  Settings,
  Bell,
  ChevronRight,
  Crown,
  LogOut,
  Shield,
  ArrowRight,
  Send,
  CheckCircle2,
  Loader2,
  Inbox,
  BookOpen,
  GraduationCap,
  Clock,
  Play,
  CheckCircle,
  Award,
  MoreHorizontal,
  X,
  HelpCircle,
  Video,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — OKIKE" }] }),
  component: DashboardPage,
});

type Section =
  | "dashboard"
  | "projects"
  | "courses"
  | "ai"
  | "messages"
  | "files"
  | "calendar"
  | "milestones"
  | "settings";

const NAV: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "courses", label: "My Courses", icon: BookOpen },
  { key: "ai", label: "AI Assistant", icon: Sparkles },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "files", label: "Files", icon: FileText },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "milestones", label: "Milestones", icon: Flag },
  { key: "settings", label: "Settings", icon: Settings },
];

type Project = {
  id: string;
  title: string;
  package_name: string | null;
  stage: string;
  created_at: string;
  total: number | null;
  deposit: number | null;
  currency: string;
};
type Milestone = { id: string; project_id: string; name: string; status: string; position: number };
type Update = { id: string; project_id: string; message: string; created_at: string };

function DashboardPage() {
  const { session, loading, user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [bootcampRegs, setBootcampRegs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [readUpdates, setReadUpdates] = useState<string[]>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("okike_read_updates") : null;
    return saved ? JSON.parse(saved) : [];
  });
  const [deletedUpdates, setDeletedUpdates] = useState<string[]>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("okike_deleted_updates") : null;
    return saved ? JSON.parse(saved) : [];
  });


  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let active = true;

    async function load() {
      try {
        // Fetch projects and bootcamp registrations first
        const [{ data: p }, { data: b }] = await Promise.all([
          supabase
            .from("client_projects")
            .select("id, title, package_name, stage, created_at, total, deposit, currency")
            .eq("client_user_id", session!.user.id)
            .order("created_at", { ascending: false }),
          (supabase as any)
            .from("bootcamp_registrations")
            .select("*")
            .ilike("email", session!.user.email)
            .order("created_at", { ascending: false }),
        ]);

        if (!active) return;

        const projectIds = (p ?? []).map((x) => x.id);

        // Retrieve milestones and updates only for the user's specific projects
        const [mRes, uRes] = await Promise.all([
          projectIds.length > 0
            ? supabase
                .from("project_milestones")
                .select("id, project_id, name, status, position")
                .in("project_id", projectIds)
                .order("position")
            : Promise.resolve({ data: [] }),
          projectIds.length > 0
            ? supabase
                .from("project_updates")
                .select("id, project_id, message, created_at")
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
                .limit(8)
            : Promise.resolve({ data: [] }),
        ]);

        if (!active) return;

        setProjects((p ?? []) as Project[]);
        setMilestones((mRes.data ?? []) as Milestone[]);
        setUpdates((uRes.data ?? []) as Update[]);
        setBootcampRegs(b ?? []);
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        if (active) setDataLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_projects",
          filter: `client_user_id=eq.${session!.user.id}`,
        },
        load
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [session]);

  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => p.stage === "in_progress" || p.stage === "accepted",
    ).length;
    const completed = projects.filter((p) => p.stage === "completed").length;
    const submitted = projects.filter(
      (p) => p.stage === "submitted" || p.stage === "reviewing",
    ).length;
    return { active, completed, submitted };
  }, [projects]);

  const verifyDeposit = useServerFn(verifyProjectDeposit);
  const verifyBootcamp = useServerFn(verifyBootcampPayment);
  const updateBootcampRef = useServerFn(updateBootcampPaymentReference);

  async function handlePayBootcamp(reg: any) {
    const koraKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY;
    if (!koraKey) {
      toast.error("Payment setup is missing.");
      return;
    }
    const korapay = (window as any).Korapay;
    if (!korapay) {
      toast.error("Payment gateway failed to load.");
      return;
    }

    toast.loading("Initializing payment...");
    const refRes = await updateBootcampRef({ data: { id: reg.id } });
    toast.dismiss();

    if (!refRes.ok) {
      toast.error(refRes.error || "Could not prepare payment.");
      return;
    }

    korapay.initialize({
      key: koraKey,
      reference: refRes.reference,
      amount: getBootcampCoursePrice(reg.course),
      currency: "NGN",
      customer: {
        name: reg.name,
        email: reg.email,
      },
      onSuccess: async (transaction: any) => {
        toast.loading("Confirming payment...");
        try {
          const res = await verifyBootcamp({ data: { reference: refRes.reference! } });
          toast.dismiss();
          if (res.ok) {
            toast.success("Payment confirmed! Your ticket is active.");
            window.location.reload();
          } else {
            toast.error(res.error || "Verification failed.");
          }
        } catch {
          toast.dismiss();
          toast.error("Verification error.");
        }
      },
      onFailed: () => toast.error("Payment failed."),
      onClose: () => toast.warning("Payment closed."),
    });
  }


  function handlePayDeposit(project: Project) {
    if (!user?.email || !project.deposit) return;
    
    const koraKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY;
    if (!koraKey) {
      toast.error("Payment setup is missing. Please contact support.");
      return;
    }

    const korapay = (window as any).Korapay;
    if (!korapay) {
      toast.error("Payment gateway failed to load. Please refresh and try again.");
      return;
    }

    const reference = `project_dep_${project.id}_${Date.now()}`;
    const clientName = user.user_metadata?.full_name || user.email.split("@")[0];

    korapay.initialize({
      key: koraKey,
      reference,
      amount: project.deposit,
      currency: project.currency || "NGN",
      customer: {
        name: clientName,
        email: user.email,
      },
      onSuccess: async (transaction: any) => {
        toast.loading("Confirming deposit payment...");
        try {
          const res = await verifyDeposit({
            data: {
              projectId: project.id,
              reference,
            },
          });
          toast.dismiss();
          if (res.ok) {
            toast.success("Deposit paid! Your project is now in progress.");
            window.location.reload();
          } else {
            toast.error(res.error || "Failed to verify deposit. Please contact support.");
          }
        } catch (err) {
          toast.dismiss();
          toast.error("Verification failed. We will manually check the payment.");
        }
      },
      onFailed: () => {
        toast.error("Payment failed. Please try again.");
      },
      onClose: () => {
        toast.warning("Payment window closed.");
      },
    });
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-secondary text-ink flex items-center justify-center text-ink/40">
        Loading…
      </div>
    );
  }

  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const firstName = fullName.split(" ")[0];
  const initial = fullName.charAt(0).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="flex">
        {/* ── SIDEBAR (desktop only) ── */}
        <aside className="hidden lg:flex sticky top-0 h-screen w-60 shrink-0 flex-col border-r border-ink/10 bg-card px-4 py-5">
          <div className="px-2">
            <Link to="/" className="flex items-center" aria-label="OKIKE home">
              <img src={okikeLogo} alt="OKIKE" className="h-8 w-auto" />
            </Link>
            <div className="text-[11px] text-ink/50 mt-0.5">Your Digital Ecosystem</div>
          </div>

          <nav className="mt-7 flex-1 flex flex-col gap-1 overflow-y-auto">
            {NAV.map((t) => {
              const active = section === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setSection(t.key)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition text-left ${active
                    ? "bg-brand/15 text-brand ring-1 ring-brand/25"
                    : "text-ink/70 hover:text-ink hover:bg-ink/5"
                    }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{t.label}</span>
                </button>
              );
            })}

            {role === "admin" && (
              <Link
                to="/admin"
                className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:text-brand hover:bg-ink/5 ring-1 ring-ink/10"
              >
                <Shield className="size-4 shrink-0" />
                <span>Admin panel</span>
              </Link>
            )}

            {(role === "admin" || role === "instructor") && (
              <Link
                to="/instructor"
                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:text-brand hover:bg-ink/5 ring-1 ring-ink/10"
              >
                <GraduationCap className="size-4 shrink-0" />
                <span>Instructor panel</span>
              </Link>
            )}
          </nav>

          <Link
            to="/book"
            className="mt-4 rounded-2xl p-3 bg-gradient-to-br from-brand/25 to-brand/5 ring-1 ring-brand/25 flex items-center gap-3 hover:from-brand/35 transition"
          >
            <div className="size-9 rounded-xl bg-brand/25 ring-1 ring-brand/40 grid place-items-center text-brand shrink-0">
              <Crown className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Start a project</div>
              <div className="text-[11px] text-ink/60">Tell us what to build</div>
            </div>
          </Link>

          <div className="mt-3 flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="relative shrink-0">
              <div className="size-10 rounded-full bg-brand/20 ring-2 ring-brand/30 grid place-items-center text-sm font-semibold text-brand">
                {initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-card" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate capitalize">{fullName}</div>
              <div className="text-[11px] text-ink/50 capitalize">{role || "Client"}</div>
            </div>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="text-ink/40 hover:text-brand p-1 rounded"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* ── MOBILE HEADER ── */}
          <header className="sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-4 py-3 bg-background/90 backdrop-blur border-b border-ink/10">
            {/* Mobile: logo + greeting */}
            <Link to="/" className="lg:hidden shrink-0" aria-label="OKIKE home">
              <img src={okikeLogo} alt="OKIKE" className="h-6 w-auto" />
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium capitalize text-ink/80 lg:block hidden">
                {section === "dashboard" ? "Overview" : section}
              </h2>
              <h2 className="text-sm font-medium text-ink/80 lg:hidden capitalize">
                {section === "dashboard" ? "Overview" : section}
              </h2>
            </div>
            <button
              onClick={() => setSection("ai")}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-brand/15 text-brand ring-1 ring-brand/25 px-3 py-2 text-sm font-medium hover:bg-brand/20"
            >
              <Sparkles className="size-4" /> Ask OKIKE AI
            </button>
            <button
              onClick={() => setSection("messages")}
              className="relative rounded-xl p-2 ring-1 ring-ink/10 hover:bg-ink/5"
              aria-label="Messages"
            >
              <MessageSquare className="size-4 text-ink/70" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 ring-1 ring-ink/10 hover:bg-ink/5"
                aria-label="View latest updates"
                title="View latest updates"
              >
                <Bell className="size-4 text-ink/70" />
                {updates.filter(u => !deletedUpdates.includes(u.id) && !readUpdates.includes(u.id)).length > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-brand text-[10px] font-semibold text-brand-foreground grid place-items-center animate-pulse">
                    {updates.filter(u => !deletedUpdates.includes(u.id) && !readUpdates.includes(u.id)).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card ring-1 ring-ink/15 shadow-xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center border-b border-ink/5 pb-2 mb-3">
                    <span className="font-semibold text-xs text-ink uppercase tracking-wider">Notifications & Updates</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-brand hover:underline font-semibold"
                    >
                      Close
                    </button>
                  </div>
                  {updates.filter(u => !deletedUpdates.includes(u.id)).length === 0 ? (
                    <div className="text-center py-6 text-xs text-ink/40">No new updates or alerts.</div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {updates
                        .filter(u => !deletedUpdates.includes(u.id))
                        .map((up) => {
                        const proj = projects.find(p => p.id === up.project_id);
                        const isRead = readUpdates.includes(up.id);
                        return (
                          <div key={up.id} className={`text-xs p-2 rounded-xl flex flex-col gap-1 ring-1 text-left relative group ${isRead ? "bg-surface/50 ring-ink/5 opacity-70" : "bg-surface ring-ink/10"}`}>
                            <div className="flex justify-between items-center pr-10">
                              <span className="font-semibold text-brand-text truncate max-w-[15ch]">{proj?.title || "Project Update"}</span>
                              <span className="text-[9px] text-ink/40">{new Date(up.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-ink/85 leading-relaxed font-sans pr-10">{up.message}</p>

                            <div className="absolute right-2 top-2 bottom-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-center">
                              {!isRead && (
                                <button
                                  title="Mark as read"
                                  onClick={() => {
                                    const next = [...readUpdates, up.id];
                                    setReadUpdates(next);
                                    localStorage.setItem("okike_read_updates", JSON.stringify(next));
                                  }}
                                  className="p-1 rounded hover:bg-ink/10 text-brand"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </button>
                              )}
                              <button
                                title="Delete"
                                onClick={() => {
                                  const next = [...deletedUpdates, up.id];
                                  setDeletedUpdates(next);
                                  localStorage.setItem("okike_deleted_updates", JSON.stringify(next));
                                }}
                                className="p-1 rounded hover:bg-red-500/10 text-red-500"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
            <ThemeToggle />
            {(role === "instructor" || role === "admin") && (
              <Link
                to="/instructor"
                className="lg:hidden flex items-center gap-1.5 bg-brand text-brand-foreground px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition hover:opacity-90 shrink-0"
              >
                <GraduationCap className="size-4" />
                <span className="hidden sm:inline">Console</span>
              </Link>
            )}
            <button
              onClick={() => setSection("settings")}
              className="size-8 rounded-full bg-brand/20 ring-2 ring-brand/30 grid place-items-center text-sm font-semibold text-brand hover:bg-brand/30 transition"
              aria-label="Account settings"
              title="Account settings"
            >
              {initial}
            </button>
          </header>

          <main className="flex-1 px-3 sm:px-4 md:px-6 py-5 min-w-0 pb-24 lg:pb-5">
            {section === "dashboard" && (
              <DashboardOverview
                firstName={firstName}
                greeting={greeting}
                projects={projects}
                milestones={milestones}
                updates={updates}
                stats={stats}
                loading={dataLoading}
                onOpenAI={() => setSection("ai")}
                onSeeProjects={() => setSection("projects")}
                onPayDeposit={handlePayDeposit}
                bootcampRegs={bootcampRegs}
                onPayBootcamp={handlePayBootcamp}
              />
            )}
            {section === "projects" && (
              <ProjectsView
                projects={projects}
                milestones={milestones}
                loading={dataLoading}
                onPayDeposit={handlePayDeposit}
                clientUserId={session?.user?.id ?? ""}
                clientEmail={session?.user?.email ?? ""}
              />
            )}
            {section === "courses" && <CoursesView bootcampRegs={bootcampRegs} fullName={fullName} />}
            {section === "ai" && (
              <AIView
                firstName={firstName}
                projects={projects}
                milestones={milestones}
                updates={updates}
              />
            )}
            {section === "messages" && (
              <SupportChatConsole
                clientName={fullName}
                clientEmail={session?.user?.email ?? ""}
              />
            )}
            {section === "files" && (
              <EmptyView
                title="No files yet"
                subtitle="Files attached to your projects will show up here."
              />
            )}
            {section === "calendar" && (
              <EmptyView
                title="Calendar"
                subtitle="Milestone deadlines and meetings will appear here once scheduled."
              />
            )}
            {section === "milestones" && (
              <MilestonesView projects={projects} milestones={milestones} />
            )}
            {section === "settings" && (
              <SettingsView email={user?.email ?? ""} fullName={fullName} user={user} role={role} />
            )}
          </main>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <MobileBottomNav section={section} setSection={setSection} role={role} />
    </div>
  );
}

/* ---------------- Overview ---------------- */

function progressFor(projectId: string, milestones: Milestone[]) {
  const own = milestones.filter((m) => m.project_id === projectId);
  if (!own.length) return 0;
  const done = own.filter((m) => m.status === "done").length;
  return Math.round((done / own.length) * 100);
}

function getGoogleCalendarLink(title: string, startTimeStr: string, meetingUrl: string) {
  try {
    const startDate = new Date(startTimeStr);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    const formatISO = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const startISO = formatISO(startDate);
    const endISO = formatISO(endDate);

    const details = `Join the live session here: ${meetingUrl}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startISO}/${endISO}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(meetingUrl)}`;
  } catch (err) {
    return "#";
  }
}

/* ---------------- Interactive Daily Engagement Systems ---------------- */

interface CodeChallenge {
  title: string;
  question: string;
  code: string;
  options: string[];
  correctIndex: number;
}

const CHALLENGES: Record<string, CodeChallenge[]> = {
  "Cyber Security": [
    {
      title: "Daily Cyber Security Challenge",
      question: "Which tool is commonly used to perform active network scanning and OS fingerprinting?",
      code: `# Target discovery scan command\nnmap -O -F 192.168.1.1`,
      options: ["Wireshark", "Metasploit", "Nmap", "Burp Suite"],
      correctIndex: 2
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "Which of the following is a symmetric key encryption algorithm?",
      code: `# Encryption algorithm\nconst algo = 'AES-256-CBC';`,
      options: ["RSA", "AES", "ECC", "Diffie-Hellman"],
      correctIndex: 1
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "What is the primary purpose of a web application firewall (WAF)?",
      code: `# WAF rule example\nSecRule ARGS "@xss" "id:1234,deny"`,
      options: ["Protect against DDoS", "Filter HTTP/HTTPS traffic", "Provide VPN access", "Encrypt database"],
      correctIndex: 1
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "In standard Linux file permissions, what does 'chmod 755' mean?",
      code: `$ chmod 755 script.sh`,
      options: ["Read/write/execute for all", "Read/write for owner, read for others", "Read/write/execute for owner, read/execute for others", "Execute only for owner"],
      correctIndex: 2
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "What type of attack involves injecting malicious SQL statements into entry fields?",
      code: `SELECT * FROM users WHERE username = 'admin' OR '1'='1'`,
      options: ["Cross-Site Scripting", "Cross-Site Request Forgery", "SQL Injection", "Command Injection"],
      correctIndex: 2
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "What is the standard port for HTTPS?",
      code: `# Connect to secure web server\ncurl -v https://example.com`,
      options: ["80", "443", "8080", "22"],
      correctIndex: 1
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "Which tool is widely used for intercepting and modifying HTTP traffic?",
      code: `# Starting the proxy\njava -jar burpsuite_community.jar`,
      options: ["Burp Suite", "Hashcat", "John the Ripper", "Hydra"],
      correctIndex: 0
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "What is the process of hiding data within another file or message called?",
      code: `$ steghide embed -cf image.jpg -ef secret.txt`,
      options: ["Cryptography", "Steganography", "Obfuscation", "Hashing"],
      correctIndex: 1
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "Which cryptographic hash function produces a 256-bit hash value?",
      code: `$ echo -n "hello" | sha256sum`,
      options: ["MD5", "SHA-1", "SHA-256", "NTLM"],
      correctIndex: 2
    },
    {
      title: "Daily Cyber Security Challenge",
      question: "In a typical firewall policy, what does 'implicit deny' mean?",
      code: `# Firewall rule\nDENY ALL ANY ANY`,
      options: ["Allow all traffic by default", "Block any traffic not explicitly allowed", "Deny only known bad IP addresses", "Prompt user for every connection"],
      correctIndex: 1
    }
  ],
  "Frontend Web": [
    {
      title: "Daily Frontend Challenge",
      question: "Which CSS property is used to create smooth transitions between element states?",
      code: `/* Hover transition animation */\n.btn {\n  transition: all 0.3s ease;\n}`,
      options: ["animation-duration", "transform-style", "transition", "will-change"],
      correctIndex: 2
    },
    {
      title: "Daily Frontend Challenge",
      question: "Which HTML tag is used to define an internal style sheet?",
      code: `<!-- Internal CSS -->\n<style>\n  body { background-color: linen; }\n</style>`,
      options: ["<script>", "<style>", "<css>", "<link>"],
      correctIndex: 1
    },
    {
      title: "Daily Frontend Challenge",
      question: "How do you select an element with id 'demo' in CSS?",
      code: `/* CSS id selector */\n#demo {\n  color: red;\n}`,
      options: [".demo", "#demo", "demo", "*demo"],
      correctIndex: 1
    },
    {
      title: "Daily Frontend Challenge",
      question: "Which JavaScript method is used to write HTML output?",
      code: `// Write to document\ndocument.write("Hello World!");`,
      options: ["console.log()", "document.write()", "window.alert()", "document.output()"],
      correctIndex: 1
    },
    {
      title: "Daily Frontend Challenge",
      question: "What does CSS stand for?",
      code: `/* CSS Example */\nbody { font-family: Arial; }`,
      options: ["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"],
      correctIndex: 2
    },
    {
      title: "Daily Frontend Challenge",
      question: "Which element is used to group inline elements?",
      code: `<!-- Inline grouping -->\n<p>This is a <span class="highlight">test</span>.</p>`,
      options: ["<div>", "<group>", "<span>", "<section>"],
      correctIndex: 2
    },
    {
      title: "Daily Frontend Challenge",
      question: "What is the output of `typeof null` in JavaScript?",
      code: `console.log(typeof null);`,
      options: ["null", "undefined", "object", "string"],
      correctIndex: 2
    },
    {
      title: "Daily Frontend Challenge",
      question: "In CSS Flexbox, which property defines the alignment along the main axis?",
      code: `/* Flexbox alignment */\n.container {\n  display: flex;\n  justify-content: center;\n}`,
      options: ["align-items", "align-content", "justify-content", "flex-direction"],
      correctIndex: 2
    },
    {
      title: "Daily Frontend Challenge",
      question: "Which Web API is used to fetch resources asynchronously?",
      code: `fetch('https://api.example.com/data')\n  .then(res => res.json());`,
      options: ["XMLHttpRequest", "Fetch API", "Async API", "REST API"],
      correctIndex: 1
    },
    {
      title: "Daily Frontend Challenge",
      question: "What does HTML stand for?",
      code: `<!DOCTYPE html>`,
      options: ["HyperText Markup Language", "Hyperlinks Text Mark Language", "Home Tool Markup Language", "HyperTool Markup Language"],
      correctIndex: 0
    }
  ],
  "Mobile Dev": [
    {
      title: "Daily Mobile Dev Challenge",
      question: "Which hook is used in React Native navigation to access the navigation prop of a screen?",
      code: `import { useNavigation } from '@react-navigation/native';\nconst navigation = useNavigation();`,
      options: ["useRoute", "useNavigation", "useLinkTo", "useContext"],
      correctIndex: 1
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "Which component is used to create a scrollable list in React Native?",
      code: `import { ScrollView } from 'react-native';\n\n<ScrollView>\n  <Text>Item 1</Text>\n</ScrollView>`,
      options: ["ListView", "RecyclerView", "ScrollView", "ScrollList"],
      correctIndex: 2
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "What is used to style components in React Native?",
      code: `import { StyleSheet } from 'react-native';\n\nconst styles = StyleSheet.create({\n  container: { flex: 1 }\n});`,
      options: ["CSS", "SCSS", "StyleSheet", "Tailwind"],
      correctIndex: 2
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "Which component handles touch interactions in React Native without giving visual feedback?",
      code: `import { TouchableWithoutFeedback } from 'react-native';`,
      options: ["TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback", "Button"],
      correctIndex: 2
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "How do you align items to the center of the cross axis in Flexbox?",
      code: `container: {\n  alignItems: 'center'\n}`,
      options: ["justifyContent: 'center'", "alignItems: 'center'", "alignContent: 'center'", "textAlign: 'center'"],
      correctIndex: 1
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "Which React Native component is used to display an image?",
      code: `import { Image } from 'react-native';\n\n<Image source={{ uri: 'https://example.com/logo.png' }} />`,
      options: ["Img", "Picture", "Image", "ImageView"],
      correctIndex: 2
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "What is the core navigation library often used for Expo and React Native apps?",
      code: `import { NavigationContainer } from '@react-navigation/native';`,
      options: ["React Router", "React Navigation", "Expo Router", "Native Navigator"],
      correctIndex: 1
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "Which module provides access to the device's system settings like vibration?",
      code: `import { Vibration } from 'react-native';\nVibration.vibrate();`,
      options: ["Device", "Hardware", "Vibration", "Haptics"],
      correctIndex: 2
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "In React Native, what does `SafeAreaView` do?",
      code: `import { SafeAreaView } from 'react-native';`,
      options: ["Secures the app from malware", "Renders content within the safe area boundaries of a device", "Encrypts local storage", "Prevents app crashes"],
      correctIndex: 1
    },
    {
      title: "Daily Mobile Dev Challenge",
      question: "How do you declare a state variable in a functional React Native component?",
      code: `const [count, setCount] = useState(0);`,
      options: ["this.state", "setState", "useState", "useContext"],
      correctIndex: 2
    }
  ],
  "UI/UX Design": [
    {
      title: "Daily UI/UX Design Challenge",
      question: "What does visual hierarchy establish in a user interface layout?",
      code: `/* Visual hierarchy scaling */\nh1 { font-size: 2.25rem; font-weight: 800; }`,
      options: ["System loading speed", "Order of user attention", "Color contrast ratios", "Breakpoints layout grid"],
      correctIndex: 1
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "Which principle refers to the consistent alignment of elements in a design?",
      code: `/* Grid alignment */\n.grid { display: grid; gap: 16px; }`,
      options: ["Contrast", "Repetition", "Alignment", "Proximity"],
      correctIndex: 2
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "What is a 'Call to Action' (CTA)?",
      code: `<!-- CTA Button -->\n<button class="cta-btn">Sign Up Now</button>`,
      options: ["An error message", "A prompt encouraging user action", "A navigation menu", "A loading spinner"],
      correctIndex: 1
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "Which color model is used for digital screens?",
      code: `/* Digital color */\ncolor: rgb(255, 0, 0);`,
      options: ["CMYK", "RGB", "Pantone", "RYB"],
      correctIndex: 1
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "What does UX stand for?",
      code: `<!-- User Experience Design -->`,
      options: ["User Experience", "User Interface", "Universal Experience", "Unified Experience"],
      correctIndex: 0
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "What is wireframing?",
      code: `<!-- Conceptual Layout -->\n<div class="wireframe-box">Header</div>`,
      options: ["High-fidelity prototype", "A low-fidelity visual representation of a layout", "Adding colors and images", "Writing HTML code"],
      correctIndex: 1
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "Which tool is widely considered an industry standard for UI vector design and prototyping?",
      code: `/* Vector design tools */`,
      options: ["Adobe Photoshop", "Figma", "Microsoft Word", "Notepad++"],
      correctIndex: 1
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "What is 'whitespace' or 'negative space' in design?",
      code: `/* Whitespace */\n.container { padding: 40px; margin: 20px; }`,
      options: ["A background color that is strictly white", "Empty space around and between elements", "An area for user comments", "A missing image"],
      correctIndex: 1
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "What does 'Responsive Design' mean?",
      code: `@media (max-width: 768px) {\n  .layout { flex-direction: column; }\n}`,
      options: ["Designing interfaces that adapt to different screen sizes", "An app that responds quickly to user clicks", "A design with lots of animations", "A design using only vector graphics"],
      correctIndex: 0
    },
    {
      title: "Daily UI/UX Design Challenge",
      question: "Which heuristic emphasizes keeping users informed about system status?",
      code: `<div class="loading-spinner">Loading...</div>`,
      options: ["Match between system and real world", "User control and freedom", "Visibility of system status", "Error prevention"],
      correctIndex: 2
    }
  ]
};

function DailyCodeBite({ bootcampRegs }: { bootcampRegs: any[] }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [streak, setStreak] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("okike_streak") : null;
    return saved ? parseInt(saved, 10) : 0;
  });
  const [xp, setXp] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("okike_xp") : null;
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lastStreakDate, setLastStreakDate] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("okike_last_streak_date") : null;
  });


  // Pick first registration course or default to Frontend Web
  const userCourse = bootcampRegs?.[0]?.course || "Frontend Web";
  
  // Clean matching track key
  let matchedTrack = "Frontend Web";
  if (userCourse.toLowerCase().includes("security") || userCourse.toLowerCase().includes("cyber")) {
    matchedTrack = "Cyber Security";
  } else if (userCourse.toLowerCase().includes("mobile") || userCourse.toLowerCase().includes("react native") || userCourse.toLowerCase().includes("ios") || userCourse.toLowerCase().includes("android")) {
    matchedTrack = "Mobile Dev";
  } else if (userCourse.toLowerCase().includes("design") || userCourse.toLowerCase().includes("ui") || userCourse.toLowerCase().includes("ux") || userCourse.toLowerCase().includes("figma")) {
    matchedTrack = "UI/UX Design";
  } else {
    matchedTrack = "Frontend Web";
  }

  const trackChallenges = CHALLENGES[matchedTrack] || CHALLENGES["Frontend Web"];
  
  // Use the current day of the year to cycle through the challenges
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const challengeIndex = (dayOfYear + currentQuestionIndex) % trackChallenges.length;
  const challenge = trackChallenges[challengeIndex];

  function handleVerify() {
    if (selectedOption === challenge.correctIndex) {
      setVerified(true);
      setError(false);

      const todayString = new Date().toDateString();
      let nextStreak = streak;

      if (lastStreakDate !== todayString) {
        nextStreak = streak + 1;
        setStreak(nextStreak);
        setLastStreakDate(todayString);
        localStorage.setItem("okike_streak", String(nextStreak));
        localStorage.setItem("okike_last_streak_date", todayString);
      }
      
      const nextXp = xp + 15;
      setXp(nextXp);
      localStorage.setItem("okike_xp", String(nextXp));
      toast.success("Correct answer! +15 XP added to your dashboard.");
    } else {
      setError(true);
      setVerified(false);
      toast.error("Incorrect. Try again!");
    }
  }

  // Reset selected option when active course changes to prevent boundary index issues
  useEffect(() => {
    setSelectedOption(null);
    setVerified(false);
  }, [userCourse]);

  return (
    <section className="rounded-3xl bg-card ring-1 ring-ink/10 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-ink/5 pb-3">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-brand" />
          <h3 className="font-semibold text-base text-ink">{challenge.title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-ink/50">🔥 {streak} Day Streak</span>
          <span className="font-mono bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">{xp} XP</span>
        </div>
      </div>

      <div className="text-left">
        <p className="text-sm text-ink leading-relaxed mb-3">{challenge.question}</p>
        <pre className="p-3 bg-surface text-ink/85 rounded-xl text-xs font-mono mb-4 ring-1 ring-ink/5 overflow-x-auto">
          <code>{challenge.code}</code>
        </pre>
      </div>

      {!verified ? (
        <div className="flex flex-col gap-2">
          <div className="grid sm:grid-cols-2 gap-2">
            {challenge.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedOption(idx);
                  setError(false);
                }}
                className={`text-left px-4 py-3 rounded-xl text-xs font-medium transition ring-1 cursor-pointer ${
                  selectedOption === idx
                    ? "bg-brand/15 ring-brand text-brand"
                    : "bg-surface/50 ring-ink/10 text-ink/75 hover:bg-surface"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={selectedOption === null}
            onClick={handleVerify}
            className="mt-2 py-2.5 bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
          >
            Verify Solution
          </button>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>✓ Challenge completed! Keep your streak going.</span>
          <button
            type="button"
            onClick={() => {
              setVerified(false);
              setSelectedOption(null);
              setCurrentQuestionIndex(prev => prev + 1);
            }}
            className="text-[10px] uppercase tracking-wider text-brand hover:bg-brand/10 px-2 py-1.5 rounded-lg font-bold transition cursor-pointer"
          >
            Next Question
        </button>
      </div>
    )}
  </section>
);
}

function DailyTechNews() {
  const news = [
    {
      tag: "Frontend",
      title: "React 19 & Next.js 15: Deep Dive into the Compiler",
      desc: "How automatic memoization is changing performance tuning.",
      url: "https://react.dev"
    },
    {
      tag: "Security",
      title: "Critical RCE Found in Popular Open-Source Gateways",
      desc: "Security audit urges immediate package update to patch memory leaks.",
      url: "https://cve.mitre.org"
    },
    {
      tag: "AI & ML",
      title: "State of Agentic Coding Frameworks in 2026",
      desc: "A review of how code assistants cooperate with developers.",
      url: "https://arxiv.org"
    }
  ];

  return (
    <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-5 text-left">
      <h3 className="font-semibold text-sm mb-1">Tech News Digest</h3>
      <p className="text-xs text-ink/50 mb-4">Curated daily news for your track.</p>

      <ul className="space-y-4">
        {news.map((item, idx) => (
          <li key={idx} className="group flex flex-col gap-1 border-b border-ink/5 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-bold uppercase tracking-wider bg-brand/10 text-brand px-1.5 py-0.5 rounded">
                {item.tag}
              </span>
            </div>
            <h4 className="text-xs font-semibold text-ink group-hover:text-brand transition mt-1">
              <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                {item.title}
              </a>
            </h4>
            <p className="text-[10px] text-ink/60 line-clamp-2 leading-relaxed">{item.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectPulses({ updates, projectsCount }: { updates: Update[]; projectsCount: number }) {
  if (projectsCount === 0) return null;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-5 text-left">
      <h3 className="font-semibold text-sm mb-1">Project Pulse Timeline</h3>
      <p className="text-xs text-ink/50 mb-4">Live system development activities.</p>

      {updates.length === 0 ? (
        <div className="text-xs text-ink/40 py-2 italic leading-relaxed">
          Your project timeline is active. Real-time development logs will post here once engineering commences.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-ink/10">
          {updates.slice(0, 4).map((log) => (
            <div key={log.id} className="relative flex flex-col gap-0.5">
              {/* Status dot indicator */}
              <div className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-brand bg-card ring-4 ring-brand/10" />
              <p className="text-xs font-medium text-ink leading-relaxed">{log.message}</p>
              <span className="text-[9px] text-ink/40 font-mono">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardOverview({
  firstName,
  greeting,
  projects,
  milestones,
  updates,
  stats,
  loading,
  onOpenAI,
  onSeeProjects,
  onPayDeposit,
  bootcampRegs,
  onPayBootcamp,
}: {
  firstName: string;
  greeting: string;
  projects: Project[];
  milestones: Milestone[];
  updates: Update[];
  stats: { active: number; completed: number; submitted: number };
  loading: boolean;
  onOpenAI: () => void;
  onSeeProjects: () => void;
  onPayDeposit: (p: Project) => void;
  bootcampRegs: any[];
  onPayBootcamp: (reg: any) => void;
}) {
  const active = projects
    .filter((p) => p.stage === "in_progress" || p.stage === "accepted")
    .slice(0, 3);
  const nextMilestone = milestones.find((m) => m.status === "active");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
      <div className="flex flex-col gap-5 min-w-0">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl ring-1 ring-ink/10 bg-card">
          {/* Light Theme Day Image */}
          <img
            src={heroImgLight}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90 block dark:hidden select-none pointer-events-none"
          />
          {/* Dark Theme Night Image */}
          <img
            src={heroImg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-85 hidden dark:block select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-transparent" />
          <div className="relative p-6 md:p-9 min-h-[220px] flex flex-col justify-center max-w-xl">
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight">
              {greeting}, <span className="capitalize">{firstName}</span> 👋
            </h1>
            <p className="text-ink/70 mt-2 text-sm md:text-base">
              {projects.length === 0
                ? "Welcome to OKIKE. Start your first project to see progress here."
                : `You have ${stats.active} active project${stats.active === 1 ? "" : "s"}.`}
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              {projects.length === 0 ? (
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
                >
                  Start a project <ArrowRight className="size-4" />
                </Link>
              ) : (
                <button
                  onClick={onSeeProjects}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
                >
                  View projects <ArrowRight className="size-4" />
                </button>
              )}
              <button
                onClick={onOpenAI}
                className="inline-flex items-center gap-2 rounded-xl bg-card/80 backdrop-blur ring-1 ring-ink/15 px-4 py-2.5 text-sm font-medium hover:bg-card"
              >
                Open AI Assistant
              </button>
            </div>
          </div>
        </section>

        {/* Daily Engagement Systems */}
        {bootcampRegs && bootcampRegs.length > 0 && (
          <DailyCodeBite bootcampRegs={bootcampRegs} />
        )}

        {/* Bootcamp tickets */}
        {bootcampRegs && bootcampRegs.length > 0 && (
          <div className="flex flex-col gap-4">
            {bootcampRegs.map((reg: any) => (
              <section key={reg.id} className="rounded-2xl bg-card ring-1 ring-ink/10 p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="size-5 text-brand" />
                      Computing Synergy Summit — {reg.course}
                    </h2>
                    <p className="text-xs text-ink/50 mt-1">1st August 2026 · Venue TBA</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    reg.payment_status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"
                      : reg.payment_status === "free"
                        ? "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
                        : "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 animate-pulse"
                  }`}>
                    {reg.payment_status === "paid" ? "Confirmed (Paid)" : reg.payment_status === "free" ? "Confirmed (Free)" : "Payment Pending"}
                  </span>
                </div>
                <p className="text-sm text-ink/75 leading-relaxed">
                  Hi <strong className="text-ink">{reg.name}</strong>, your spot is reserved for the <strong className="text-ink">{reg.course}</strong> track.
                </p>
                <div className="grid grid-cols-2 gap-4 bg-surface ring-1 ring-ink/5 rounded-xl p-4 text-xs">
                  <div>
                    <span className="text-ink/40 uppercase tracking-wider block text-[10px]">Department</span>
                    <span className="font-medium text-ink/80">{reg.department} ({reg.level})</span>
                  </div>
                  <div>
                    <span className="text-ink/40 uppercase tracking-wider block text-[10px]">Ticket Reference</span>
                    <span className="font-medium text-ink/80 truncate block">{reg.payment_reference || "N/A (Free)"}</span>
                  </div>
                </div>

                {/* WhatsApp Community Invite Alert */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    Join the Official WhatsApp Community
                  </div>
                  <p className="text-ink/70 leading-relaxed">
                    Get real-time announcements, virtual session links, assignments, and curriculum updates. Joining the group is required for this track.
                  </p>
                  <a
                    href="https://chat.whatsapp.com/GLemXx2uWn5F6Nm40ihiD7"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] transition mt-1"
                  >
                    Join WhatsApp Community &rarr;
                  </a>
                </div>

                {reg.payment_status !== "pending" && (
                  <a
                    href={`/api/receipt/${reg.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 w-full py-2.5 rounded-xl border border-ink/10 hover:bg-ink/5 font-semibold text-xs uppercase tracking-wider block text-center text-ink transition"
                  >
                    Print Ticket / Receipt &rarr;
                  </a>
                )}
                {reg.payment_status === "pending" && (
                  <button
                    type="button"
                    onClick={() => onPayBootcamp(reg)}
                    className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition animate-pulse"
                  >
                    Pay Registration Fee (₦{getBootcampCoursePrice(reg.course).toLocaleString()}) &rarr;
                  </button>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Stats — only 3 honest tiles */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Active" value={String(stats.active)} sub="Projects in flight" />
          <StatCard label="Completed" value={String(stats.completed)} sub="Shipped projects" />
          <StatCard label="In review" value={String(stats.submitted)} sub="Awaiting acceptance" />
        </div>

        {/* Active projects list */}
        <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">My Projects</h2>
            <button onClick={onSeeProjects} className="text-xs text-ink/50 hover:text-brand">
              View all
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-ink/40 py-6">Loading…</div>
          ) : active.length === 0 ? (
            <div className="text-sm text-ink/50 py-6">
              No active projects yet.{" "}
              <Link to="/book" className="text-brand hover:underline">
                Start one
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-3">
              {active.map((p) => {
                const pct = progressFor(p.id, milestones);
                const stageLabel = p.stage === "in_progress" ? "In Progress" : "Accepted";
                const symbol = p.currency === "NGN" ? "₦" : "$";
                return (
                  <li
                    key={p.id}
                    className="rounded-xl ring-1 ring-ink/10 p-4 hover:ring-brand/30 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-brand/15 ring-1 ring-brand/25 grid place-items-center text-brand shrink-0">
                        <FolderKanban className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{p.title}</div>
                            <div className="text-xs text-ink/50 truncate">
                              {p.package_name ?? "Project"}
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-md bg-brand/15 text-brand font-medium whitespace-nowrap">
                            {stageLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex-1 h-1.5 rounded-full bg-ink/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-ink/70 w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                        {p.stage === "accepted" && p.deposit && (
                          <div className="mt-3 pt-3 border-t border-ink/5 flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-ink/70">Deposit: {symbol}{Number(p.deposit).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => onPayDeposit(p)}
                              className="px-3 py-1.5 rounded-full bg-brand text-brand-foreground font-semibold text-[10px] uppercase tracking-wider hover:opacity-90 transition animate-pulse"
                            >
                              Pay Deposit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Right rail */}
      <aside className="flex flex-col gap-5">
        <AIInsightsCard projects={projects} milestones={milestones} updates={updates} />
        
        {/* Daily Tech News Feed */}
        <DailyTechNews />

        {/* Project Pulses Timeline */}
        <ProjectPulses updates={updates} projectsCount={projects.length} />

        <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-5">
          <h3 className="font-semibold text-sm mb-1">Next up</h3>
          <p className="text-xs text-ink/60 mb-4">Your active milestone.</p>
          {nextMilestone ? (
            <div className="rounded-xl bg-brand/10 ring-1 ring-brand/20 p-4">
              <div className="text-xs uppercase tracking-wider text-brand mb-1">
                Active milestone
              </div>
              <div className="text-base font-medium">{nextMilestone.name}</div>
            </div>
          ) : (
            <div className="text-sm text-ink/50">No active milestone.</div>
          )}
        </section>

        <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Latest updates</h3>
          </div>
          {updates.length === 0 ? (
            <div className="text-sm text-ink/50">No updates yet.</div>
          ) : (
            <ul className="space-y-3">
              {updates.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-brand/15 ring-1 ring-brand/20 grid place-items-center text-brand shrink-0">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ink/80 line-clamp-2">{u.message}</div>
                    <div className="text-[10px] text-ink/40 mt-0.5">
                      {new Date(u.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

/* ---------------- Projects ---------------- */

function ProjectBuilderWizard({
  clientUserId,
  clientEmail,
  onClose,
  onSuccess,
}: {
  clientUserId: string;
  clientEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Web App");
  const [tier, setTier] = useState<"starter" | "business" | "custom">("starter");
  const [addons, setAddons] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<"standard" | "fast">("standard");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const tierPrices = {
    starter: 150000,
    business: 400000,
    custom: 1500000,
  };

  const addonPrices: Record<string, number> = {
    copywriting: 60000,
    seo: 150000,
    security: 250000,
  };

  const totalCost = useMemo(() => {
    let base = tierPrices[tier];
    let addonsSum = addons.reduce((sum, a) => sum + (addonPrices[a] || 0), 0);
    let total = base + addonsSum;
    if (urgency === "fast") {
      total = total * 1.25; // 25% premium
    }
    return Math.round(total);
  }, [tier, addons, urgency]);

  const depositRequired = useMemo(() => {
    return Math.round(totalCost * 0.3); // 30% deposit
  }, [totalCost]);

  function toggleAddon(id: string) {
    setAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a project name.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("client_projects")
        .insert({
          title,
          package_name: `${category} (${tier.toUpperCase()} package)`,
          client_user_id: clientUserId,
          client_email: clientEmail,
          stage: "submitted",
          currency: "NGN",
          total: totalCost,
          deposit: depositRequired,
        });

      if (error) throw error;

      toast.success("Project proposal submitted successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8 space-y-6 text-left max-w-2xl mx-auto">
      <div className="flex justify-between items-center border-b border-ink/5 pb-3">
        <div>
          <h3 className="font-semibold text-lg text-ink">Project Proposal Builder</h3>
          <p className="text-xs text-ink/50 mt-0.5">Configure your custom project package and generate a quote.</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-ink/50 hover:text-brand cursor-pointer uppercase font-bold"
        >
          Cancel
        </button>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-ink/50 uppercase tracking-wider block font-semibold mb-2">1. Project Category</label>
            <div className="grid grid-cols-2 gap-2">
              {["Web App", "Mobile App", "E-Commerce", "Custom Software"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-3 px-4 text-xs font-semibold rounded-xl text-left transition ring-1 cursor-pointer ${
                    category === cat
                      ? "bg-brand/15 ring-brand text-brand"
                      : "bg-surface/50 ring-ink/10 text-ink/75 hover:bg-surface"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-ink/50 uppercase tracking-wider block font-semibold mb-2">2. Package Scale</label>
            <div className="space-y-2">
              {[
                { id: "starter", title: "Starter Site", price: 150000, desc: "Polished single-page landing site to convert leads." },
                { id: "business", title: "Business Platform", price: 400000, desc: "Multi-page website with CMS content manager controls." },
                { id: "custom", title: "Enterprise Custom", price: 1500000, desc: "Full SaaS build, integrations, databases, and custom scale dashboards." }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setTier(p.id as any)}
                  className={`w-full py-3 px-4 text-xs font-semibold rounded-xl text-left transition ring-1 flex justify-between items-center cursor-pointer ${
                    tier === p.id
                      ? "bg-brand/15 ring-brand text-brand"
                      : "bg-surface/50 ring-ink/10 text-ink/75 hover:bg-surface"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-[10px] text-ink/50 mt-0.5">{p.desc}</div>
                  </div>
                  <span className="font-bold">₦{p.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full mt-4 py-3 bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition cursor-pointer"
          >
            Next: Add-ons & Timeline &rarr;
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-ink/50 uppercase tracking-wider block font-semibold mb-2">3. Add-on Services</label>
            <div className="space-y-2">
              {[
                { id: "copywriting", label: "Professional Copywriting", price: 60000, desc: "High-converting SEO content written by copy editors." },
                { id: "seo", label: "Search Engine Optimization (SEO)", price: 150000, desc: "Keywords mappings, speed tuning, and metadata schema index logs." },
                { id: "security", label: "Extended Security Audits", price: 250000, desc: "OWASP vulnerability testings and firewall configurations." }
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => toggleAddon(a.id)}
                  className={`w-full py-3 px-4 text-xs font-semibold rounded-xl text-left transition ring-1 flex justify-between items-center cursor-pointer ${
                    addons.includes(a.id)
                      ? "bg-brand/15 ring-brand text-brand"
                      : "bg-surface/50 ring-ink/10 text-ink/75 hover:bg-surface"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-[10px] text-ink/50 mt-0.5">{a.desc}</div>
                  </div>
                  <span className="font-bold">₦{a.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-ink/50 uppercase tracking-wider block font-semibold mb-2">4. Development Urgency</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "standard", label: "Standard Delivery (6-8 weeks)", desc: "Included in base package fee." },
                { id: "fast", label: "Fast Track Delivery (3-4 weeks)", desc: "Adds 25% premium markup." }
              ].map(u => (
                <button
                  key={u.id}
                  onClick={() => setUrgency(u.id as any)}
                  className={`py-3 px-4 text-xs font-semibold rounded-xl text-left transition ring-1 cursor-pointer ${
                    urgency === u.id
                      ? "bg-brand/15 ring-brand text-brand"
                      : "bg-surface/50 ring-ink/10 text-ink/75 hover:bg-surface"
                  }`}
                >
                  <div className="font-semibold">{u.label}</div>
                  <div className="text-[9px] text-ink/50 mt-0.5">{u.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="w-1/3 py-3 border border-ink/10 rounded-xl text-xs font-semibold text-ink/75 uppercase tracking-wider hover:bg-ink/5 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="w-2/3 py-3 bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition cursor-pointer"
            >
              Generate Quote Summary &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-surface rounded-2xl border border-ink/5 space-y-3 text-xs">
            <div className="flex justify-between font-semibold border-b border-ink/5 pb-2">
              <span>Selected Project Track:</span>
              <span className="text-brand">{category}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Base Package Price:</span>
              <span>₦{tierPrices[tier].toLocaleString()}</span>
            </div>
            {addons.length > 0 && (
              <div className="flex justify-between font-medium">
                <span>Addons Sum:</span>
                <span>₦{addons.reduce((sum, a) => sum + addonPrices[a], 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Timeline Delivery:</span>
              <span>{urgency === "fast" ? "Fast Track (+25%)" : "Standard"}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-ink/10 pt-2 text-ink">
              <span>Estimated Cost Quote:</span>
              <span>₦{totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-emerald-600 bg-emerald-500/5 p-2 rounded-lg mt-2 border border-emerald-500/10">
              <span>Deposit Required (30%):</span>
              <span>₦{depositRequired.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-ink/50 uppercase tracking-wider block font-semibold mb-2">5. Project Title / Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My E-commerce Dashboard App"
              className="w-full rounded-xl bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="w-1/3 py-3 border border-ink/10 rounded-xl text-xs font-semibold text-ink/75 uppercase tracking-wider hover:bg-ink/5 cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="w-2/3 py-3 bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            >
              {busy ? "Submitting..." : "Lock In & Save Project"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ProjectsView({
  projects,
  milestones,
  loading,
  onPayDeposit,
  clientUserId,
  clientEmail,
}: {
  projects: Project[];
  milestones: Milestone[];
  loading: boolean;
  onPayDeposit: (p: Project) => void;
  clientUserId: string;
  clientEmail: string;
}) {
  const [showWizard, setShowWizard] = useState(false);

  if (loading) return <div className="text-sm text-ink/40">Loading…</div>;

  if (showWizard) {
    return (
      <ProjectBuilderWizard
        clientUserId={clientUserId}
        clientEmail={clientEmail}
        onClose={() => setShowWizard(false)}
        onSuccess={() => setShowWizard(false)}
      />
    );
  }

  if (projects.length === 0)
    return (
      <EmptyView
        title="No projects yet"
        subtitle="Submit a project brief and we'll get started."
        ctaLabel="Start a project"
        onClickCta={() => setShowWizard(true)}
      />
    );

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center text-left">
        <div>
          <h3 className="font-semibold text-base text-ink">Active Projects</h3>
          <p className="text-xs text-ink/50">Track development milestones and make payments.</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-brand text-brand-foreground font-semibold px-4 py-2.5 text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition cursor-pointer"
        >
          New Project Brief
        </button>
      </div>
      {projects.map((p) => {
        const own = milestones.filter((m) => m.project_id === p.id);
        const pct = progressFor(p.id, milestones);
        const symbol = p.currency === "NGN" ? "₦" : "$";
        return (
          <section key={p.id} className="rounded-2xl bg-card ring-1 ring-ink/10 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-ink/50 mt-0.5">
                  {p.package_name ?? "Project"} · {p.stage.replace("_", " ")}
                </div>
              </div>
              <span className="text-xs text-ink/60">{pct}%</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-ink/10 overflow-hidden">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            {p.stage === "accepted" && p.deposit && (
              <div className="mt-4 p-4 rounded-xl bg-brand/5 border border-brand/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-ink/50 uppercase tracking-wider">Deposit Due</div>
                  <div className="font-semibold text-lg">{symbol}{Number(p.deposit).toLocaleString()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onPayDeposit(p)}
                  className="px-5 py-2.5 rounded-full bg-brand text-brand-foreground font-medium text-xs uppercase tracking-wider hover:opacity-90 transition animate-pulse"
                >
                  Pay Deposit &rarr;
                </button>
              </div>
            )}
            {own.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {own.map((m) => (
                  <li
                    key={m.id}
                    className={`rounded-lg p-3 text-xs ring-1 ${m.status === "done"
                      ? "bg-emerald-500/10 ring-emerald-500/20 text-emerald-600"
                      : m.status === "active"
                        ? "bg-brand/10 ring-brand/25 text-brand"
                        : "bg-ink/5 ring-ink/10 text-ink/60"
                      }`}
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="text-[10px] capitalize mt-0.5 opacity-80">{m.status}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- Milestones ---------------- */

function MilestonesView({
  projects,
  milestones,
}: {
  projects: Project[];
  milestones: Milestone[];
}) {
  if (milestones.length === 0)
    return (
      <EmptyView
        title="No milestones yet"
        subtitle="Milestones appear once a project enters the build stage."
      />
    );

  return (
    <div className="grid gap-6">
      {projects.map((p) => {
        const own = milestones.filter((m) => m.project_id === p.id);
        if (!own.length) return null;
        const doneCount = own.filter((m) => m.status === "done").length;
        const progressPercent = Math.round((doneCount / own.length) * 100);

        return (
          <section key={p.id} className="rounded-3xl bg-card ring-1 ring-ink/10 p-6 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-ink/5">
              <div>
                <h3 className="font-semibold text-base text-ink">{p.title}</h3>
                <span className="text-[10px] text-ink/40 uppercase tracking-widest font-semibold">{p.package_name || "Custom Development Project"}</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:w-36 bg-ink/5 rounded-full h-2 overflow-hidden ring-1 ring-ink/5">
                  <div className="bg-brand h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-xs font-mono font-bold text-brand shrink-0">{progressPercent}% Done</span>
              </div>
            </div>

            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-ink/10">
              {own.map((m) => {
                const isDone = m.status === "done";
                const isActive = m.status === "active";

                return (
                  <div key={m.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-surface/50 transition-all">
                    {/* Stepper Node */}
                    <div className={`absolute -left-[29px] top-3.5 size-4 rounded-full border-2 transition-all flex items-center justify-center ${
                      isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isActive
                          ? "bg-card border-brand ring-4 ring-brand/10"
                          : "bg-card border-ink/20"
                    }`}>
                      {isDone && (
                        <svg className="size-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isActive && <div className="size-1.5 rounded-full bg-brand animate-ping" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink/40">Step {m.position}</span>
                        {isActive && (
                          <span className="text-[8px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                            Active Phase
                          </span>
                        )}
                      </div>
                      <h4 className={`text-sm font-semibold mt-0.5 ${isDone ? "text-ink/50 line-through decoration-ink/25" : "text-ink"}`}>{m.name}</h4>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        isDone
                          ? "bg-emerald-500/10 text-emerald-600"
                          : isActive
                            ? "bg-brand/10 text-brand"
                            : "bg-ink/5 text-ink/40"
                      }`}>
                        {m.status === "done" ? "Completed" : m.status === "active" ? "In Progress" : "Queued"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- AI ---------------- */

type ChatMsg = { role: "user" | "assistant" | "tool" | "system"; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string };

function AIView({
  firstName,
  projects,
  milestones,
  updates,
}: {
  firstName: string;
  projects: Project[];
  milestones: Milestone[];
  updates: Update[];
}) {
  const ask = useServerFn(askAssistant);
  const getHistory = useServerFn(getAiConversations);
  const saveMsg = useServerFn(saveAiMessage);
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Hi ${firstName}! I'm OKIKE AI. Ask me anything about your projects, planning, or technical questions.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMemory() {
      try {
        const res = await getHistory();
        if (res.ok && res.messages && res.messages.length > 0) {
          setMessages(res.messages as any as ChatMsg[]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    }
    loadMemory();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    
    const userMsg: ChatMsg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      await saveMsg({ data: { role: "user", content } });

      const res = await ask({
        data: {
          messages: next,
          projectData: { projects, milestones, updates },
        },
      });
      if (res.ok) {
        if (res.tool_calls) {
          const aiMsg: ChatMsg = { role: "assistant", tool_calls: res.tool_calls };
          setMessages([...next, aiMsg]);
        } else {
          const aiMsg: ChatMsg = { role: "assistant", content: res.text };
          setMessages([...next, aiMsg]);
          await saveMsg({ data: { role: "assistant", content: res.text } });
        }
      } else {
        toast.error(res.error);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  }

  const suggestions = [
    "Summarize the status of my projects",
    "Draft a new project for me",
    "I want to register for a bootcamp course",
  ];

  return (
    <section className="rounded-2xl bg-card ring-1 ring-ink/10 flex flex-col h-[calc(100vh-140px)]">
      <div className="px-5 py-4 border-b border-ink/10 flex items-center gap-2">
        <Sparkles className="size-4 text-brand" />
        <h2 className="font-semibold">OKIKE AI Assistant</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!loaded ? (
          <div className="flex justify-center p-4">
            <Loader2 className="size-5 animate-spin text-ink/40" />
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} flex-col gap-2`}>
              {m.content && (
                <div className={`self-${m.role === "user" ? "end" : "start"} max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-brand text-brand-foreground" : "bg-secondary ring-1 ring-ink/10"}`}>
                  {m.content}
                </div>
              )}
              {m.tool_calls?.map((tc: any, j) => {
                if (tc.function.name === "draft_project") {
                  const args = JSON.parse(tc.function.arguments);
                  return (
                    <div key={j} className="self-start max-w-[80%] bg-surface border border-ink/10 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold uppercase text-brand tracking-wider">Project Draft Generated</div>
                      <h4 className="font-semibold">{args.title}</h4>
                      <p className="text-xs text-ink/80">{args.description}</p>
                      <button 
                        onClick={() => {
                          toast.success("Redirecting to project creator...");
                          navigate({ to: "/book" });
                        }}
                        className="mt-2 w-full bg-brand text-brand-foreground text-xs font-bold py-2 rounded-lg"
                      >
                        Confirm & Create Project
                      </button>
                    </div>
                  );
                }
                if (tc.function.name === "register_course") {
                  return (
                    <div key={j} className="self-start max-w-[80%] bg-surface border border-ink/10 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold uppercase text-brand tracking-wider">Course Registration Drafted</div>
                      <p className="text-xs text-ink/80">I have prepared your bootcamp registration.</p>
                      <button 
                        onClick={() => {
                          toast.success("Redirecting to registration portal...");
                          navigate({ to: "/bootcamp" });
                        }}
                        className="mt-2 w-full bg-brand text-brand-foreground text-xs font-bold py-2 rounded-lg"
                      >
                        Confirm Registration
                      </button>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-secondary ring-1 ring-ink/10 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2 text-ink/60">
              <Loader2 className="size-3.5 animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-5 pt-2 pb-3 flex gap-2 flex-wrap border-t border-ink/10">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs px-3 py-1.5 rounded-full bg-secondary ring-1 ring-ink/10 hover:ring-brand/30"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="px-5 pb-5 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 bg-secondary ring-1 ring-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-brand/40"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="size-10 rounded-xl bg-brand grid place-items-center text-brand-foreground hover:opacity-90 disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}

/* ---------------- Courses ---------------- */

type Course = {
  id: string;
  title: string;
  slug: string;
  track: string;
  description: string | null;
  duration: string;
  image_url: string | null;
  instructor: string | null;
  lessons: string[];
  milestones?: { id: string; title: string }[];
  position: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  progress?: number;
  status?: "enrolled" | "completed" | "available";
  lessonsCompleted?: number;
  nextLesson?: string;
};

const MOCK_COURSES_DATA: Course[] = [
  {
    id: "frontend-track",
    title: "Frontend Web Development",
    slug: "frontend-web-development",
    track: "Frontend Web Development",
    description: "Learn HTML, CSS, JavaScript, TailwindCSS, React, and modern deployment architectures.",
    duration: "12 Weeks",
    image_url: null,
    instructor: "Okike Frontend Team",
    lessons: [
      "Introduction to HTML & CSS Markup",
      "Responsive Layouts, Flexbox & Grid Systems",
      "JavaScript Fundamentals & ES6+ Features",
      "DOM Manipulation, Actions & Event Handlers",
      "React Basics: Component State & Lifecycle",
      "Advanced React Hooks: useEffect & useContext",
      "API Integration & Async Data Fetching",
      "State Management with Context & Redux",
      "Vite, Linting, & Production Builds",
      "Git Collaboration & GitHub Hosting"
    ],
    position: 1,
    published: true,
    created_at: "",
    updated_at: ""
  },
  {
    id: "backend-track",
    title: "Backend Web Development",
    slug: "backend-web-development",
    track: "Backend Web Development",
    description: "Learn Node.js, Express server frameworks, Postgres SQL database design, Supabase API integrations, and token-based security.",
    duration: "12 Weeks",
    image_url: null,
    instructor: "Okike Backend Team",
    lessons: [
      "Intro to Server-Client Architectures",
      "Node.js Ecosystem & Package Management",
      "Building RESTful APIs with Express",
      "PostgreSQL Database Design & Querying",
      "ORM vs Raw SQL & Database Migrations",
      "User Authentication, Hashing & JWT",
      "Supabase Client & Server Integrations",
      "Serverless Functions & Edge Routing",
      "Testing Node APIs with Jest",
      "Docker Containerization & Render Hosting"
    ],
    position: 2,
    published: true,
    created_at: "",
    updated_at: ""
  },
  {
    id: "uiux-track",
    title: "Product Design (UI/UX)",
    slug: "uiux-track",
    track: "Product Design (UI/UX)",
    description: "Learn Figma layout tools, wireframing, interactive prototyping, user research, and UI developer handoff principles.",
    duration: "12 Weeks",
    image_url: null,
    instructor: "Okike Design Team",
    lessons: [
      "Core UI/UX Principles & Design Thinking",
      "User Research, Personas & User Journeys",
      "Information Architecture & Sitemap Layouts",
      "Figma workspace: Shapes, Frames & Layout grids",
      "Wireframing & Low-Fidelity Mockups",
      "Typography, Grid Alignment & Color Palettes",
      "Component Libraries & Auto-Layout in Figma",
      "High-Fidelity UI Prototyping & Interactions",
      "Usability Testing, Heatmaps & User Feedback",
      "Asset Export & Developer Handoff Rules"
    ],
    position: 3,
    published: true,
    created_at: "",
    updated_at: ""
  },
  {
    id: "mobile-track",
    title: "Mobile App Development",
    slug: "mobile-app-track",
    track: "Mobile App Development",
    description: "Learn React Native app architectures, Expo build pipelines, native mobile styling, device APIs, and app store deployment.",
    duration: "12 Weeks",
    image_url: null,
    instructor: "Okike Mobile Team",
    lessons: [
      "React Native Fundamentals vs Web React",
      "Expo SDK & Development Tools Environment",
      "Native Views, ScrollViews & Touchables",
      "Styling & Flexbox Layouts in React Native",
      "Mobile Navigation: React Navigation Stack/Tabs",
      "Managing State & SQLite Local Caching",
      "Camera, Location, & Hardware Sensor Integration",
      "Push Notifications & Background Services",
      "Building APK/IPA bundles using EAS",
      "Google Play Store & Apple App Store Guidelines"
    ],
    position: 4,
    published: true,
    created_at: "",
    updated_at: ""
  },
  {
    id: "security-track",
    title: "Cyber Security",
    slug: "cyber-security-track",
    track: "Cyber Security",
    description: "Learn network security protocols, system scanning, ethical hacking tools, risk assessments, and defense strategies.",
    duration: "12 Weeks",
    image_url: null,
    instructor: "Okike Security Team",
    lessons: [
      "History of Security & Threat Landscapes",
      "TCP/IP Networking, Ports & Core Protocols",
      "Operating System Security & Hardening Rules",
      "Network Scanning, Nmap & Wireshark Analysis",
      "Vulnerability Identification & CVE Databases",
      "Cryptography, SSL certificates & Key exchanges",
      "Ethical Hacking: Hacking tools & Metasploit",
      "Firewalls, IDS/IPS, & Security Auditing",
      "Web App Hacking: OWASP Top 10 exploits",
      "Incident Response Plans & Forensic Investigation"
    ],
    position: 5,
    published: true,
    created_at: "",
    updated_at: ""
  }
];

const DEFAULT_QUIZZES = [
  {
    id: "quiz-1",
    title: "Module 1 Assessment: Fundamentals",
    description: "Test your understanding of the foundational lessons in your course track.",
    questions: [
      {
        question: "Which of the following describes the main goal of responsive design?",
        options: [
          "Optimizing speed on desktop servers",
          "Ensuring layout adjusts beautifully on mobile, tablet, and desktop viewports",
          "Preventing unauthorized script injection",
          "Using heavy image assets for high resolution"
        ],
        answer: 1
      },
      {
        question: "What does Git use to track changes over time?",
        options: [
          "Local zip files and backups",
          "A chain of commits representing repository snapshots",
          "A live Google Doc tracking files",
          "None of the above"
        ],
        answer: 1
      },
      {
        question: "Why do we use package managers (like npm or yarn)?",
        options: [
          "To speed up database index scans",
          "To download, update, and manage third-party code packages and dependencies",
          "To compile React styles into native mobile code",
          "To deploy the server to vercel hosting"
        ],
        answer: 1
      }
    ]
  }
];

const DEFAULT_MILESTONES = [
  { id: "ms-1", title: "Git & Workspace Setup", description: "Fork repository, connect to remote GitHub, and set up your local development workspace." },
  { id: "ms-2", title: "Module 1 Exam Passed", description: "Complete the diagnostic Module 1 fundamentals quiz with a score of 70% or higher." },
  { id: "ms-3", title: "Mid-term Project Submission", description: "Build and submit the initial prototype of your track project for review." },
  { id: "ms-4", title: "Summit Capstone Approved", description: "Deploy your final summit capstone application/design project and pass instructor review." }
];

function CertificateModal({
  courseTitle,
  studentName,
  onClose,
}: {
  courseTitle: string;
  studentName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-card border border-ink/15 shadow-2xl rounded-3xl max-w-2xl w-full p-6 md:p-8 flex flex-col gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-ink/5 hover:bg-ink/10 grid place-items-center text-ink/75 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Certificate Frame */}
        <div className="border-[12px] border-double border-brand/20 p-6 md:p-8 bg-surface rounded-2xl text-center relative overflow-hidden">
          {/* Subtle logo seal background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <Award className="size-80 text-brand animate-pulse" />
          </div>

          <div className="text-[10px] tracking-[0.25em] font-semibold text-brand uppercase mb-4">
            Certificate of Graduation
          </div>
          <div className="font-serif text-xs text-ink/60 uppercase tracking-widest mb-1">
            This is proudly awarded to
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink capitalize my-3 border-b-2 border-brand/10 pb-2 max-w-md mx-auto">
            {studentName}
          </h2>
          <p className="text-xs text-ink/65 max-w-md mx-auto leading-relaxed my-3">
            for successfully fulfilling all curriculum requirements and passing practical assessments of the intensive tech track:
          </p>
          <h3 className="font-serif text-lg md:text-xl font-bold text-brand my-2">
            {courseTitle}
          </h3>
          <p className="text-[10px] text-ink/50 font-mono mt-3">
            Issued on {new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })} · OKIKE TECH ACADEMY
          </p>

          {/* Signatures */}
          <div className="mt-8 pt-6 border-t border-ink/10 grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="flex flex-col items-center">
              <span className="font-serif italic text-xs text-brand-text font-semibold">Tunde O. Bakare</span>
              <span className="text-[8px] text-ink/40 uppercase tracking-wider mt-1 border-t border-ink/10 pt-1 w-full text-center">
                Managing Director
              </span>
            </div>
            <div className="flex flex-col items-center justify-end">
              <span className="text-[8px] text-ink/40 uppercase tracking-wider border-t border-ink/10 pt-1 w-full text-center">
                Registrar Office
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full py-3 bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition cursor-pointer"
        >
          Print / Save PDF Certificate
        </button>
      </div>
    </div>
  );
}

function CoursesView({ bootcampRegs, fullName }: { bootcampRegs: any[]; fullName: string }) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  
  const [certificateCourse, setCertificateCourse] = useState<string | null>(null);

  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredTrack, setRegisteredTrack] = useState<string | null>(null);

  // Progress states
  const [progress, setProgress] = useState<{
    lessons_completed: string[];
    quiz_scores: Record<string, number>;
    milestone_status: Record<string, string>;
    attendance_mode?: string;
  } | null>(null);

  // LMS tabs
  const [activeTab, setActiveTab] = useState<"lessons" | "milestones" | "quizzes" | "assignments" | "virtual" | "materials" | "sandbox">("lessons");
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);

  // Extra LMS module state variables
  const [dbQuizzes, setDbQuizzes] = useState<any[]>([]);
  const [dbAssignments, setDbAssignments] = useState<any[]>([]);
  const [dbVirtualClasses, setDbVirtualClasses] = useState<any[]>([]);
  const [dbCourseMaterials, setDbCourseMaterials] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submittingAssign, setSubmittingAssign] = useState<string | null>(null);
  const [assignText, setAssignText] = useState("");
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Load quizzes/assignments for active module
  useEffect(() => {
    async function loadModuleDetails() {
      if (!selectedCourse || !session?.user?.email) return;
      const activeModule = selectedCourse.lessons[activeLessonIndex];
      if (!activeModule) return;
      
      setLoadingExtra(true);
      try {
        const [{ data: q }, { data: a }, { data: vc }, { data: cm }] = await Promise.all([
          (supabase as any).from("quizzes").select("*").eq("course_id", selectedCourse.id).eq("module_name", activeModule),
          (supabase as any).from("assignments").select("*").eq("course_id", selectedCourse.id).eq("module_name", activeModule),
          (supabase as any).from("virtual_classes").select("*").eq("course_id", selectedCourse.id).eq("module_name", activeModule).order("meeting_time", { ascending: true }),
          (supabase as any).from("course_materials").select("*").eq("course_id", selectedCourse.id).eq("module_name", activeModule).order("created_at", { ascending: false }),
        ]);
        setDbQuizzes(q ?? []);
        setDbAssignments(a ?? []);
        setDbVirtualClasses(vc ?? []);
        setDbCourseMaterials(cm ?? []);

        const aIds = (a ?? []).map((x: any) => x.id);
        if (aIds.length > 0) {
          const { data: s } = await (supabase as any)
            .from("assignment_submissions")
            .select("*")
            .eq("student_email", session.user.email)
            .in("assignment_id", aIds);
          setSubmissions(s ?? []);
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        console.error("Error loading module quizzes/assignments", err);
      } finally {
        setLoadingExtra(false);
      }
    }
    loadModuleDetails();
  }, [selectedCourse, activeLessonIndex, session]);

  // Quiz taker states
  const [quizScoreFeedback, setQuizScoreFeedback] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // DB queries
  useEffect(() => {
    async function loadCoursesAndProgress() {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Query database courses
        const { data: dbCourses } = await supabase
          .from("courses")
          .select("*")
          .eq("published", true)
          .order("position", { ascending: true });

        // Query student progress
        let { data: spRow } = await (supabase as any)
          .from("student_progress")
          .select("*")
          .eq("student_email", session.user.email)
          .maybeSingle();

        if (!spRow) {
          // Auto-insert progress row on first load
          const { data: newRow } = await (supabase as any)
            .from("student_progress")
            .insert({
              student_email: session.user.email,
              lessons_completed: [],
              quiz_scores: {},
              milestone_status: {}
            })
            .select()
            .maybeSingle();
          spRow = newRow;
        }

        setProgress(spRow || { lessons_completed: [], quiz_scores: {}, milestone_status: {}, attendance_mode: "physical" });

        const isConfirmed = bootcampRegs && bootcampRegs.length > 0;
        const registeredTracks = bootcampRegs.map(r => r.course).filter(Boolean);
        const regTrackStr = registeredTracks.join(" & ");

        setIsRegistered(isConfirmed);
        setRegisteredTrack(regTrackStr || null);

        let filtered: Course[] = [];
        const sourceData = dbCourses ?? [];

        if (isConfirmed && registeredTracks.length > 0) {
          filtered = (sourceData as any[])
            .map((course: any) => {
              const completedList = spRow?.lessons_completed || [];
              const lessons = (course.lessons as string[]) ?? [];
              const completedCount = lessons.filter(l => completedList.includes(l)).length;
              const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

              return {
                ...course,
                lessons,
                status: "enrolled" as const,
                progress: pct,
                lessonsCompleted: completedCount,
              };
            })
            .filter((course) => {
              const title = (course.title || "").toLowerCase().trim();
              const track = (course.track || "").toLowerCase().trim();
              
              return registeredTracks.some(regTrack => {
                const reg = regTrack.toLowerCase().trim();
                if (title === reg || track === reg) return true;

                // Fuzzy match overlaps (e.g. Cyber Security -> Cyber Security Fundamentals)
                if (reg.includes("cyber") && (title.includes("cyber") || track.includes("cyber"))) return true;
                if (
                  (reg.includes("frontend") || reg.includes("backend") || reg.includes("web") || reg.includes("stack")) && 
                  (title.includes("stack") || title.includes("web") || title.includes("frontend") || title.includes("backend") || track.includes("web"))
                ) {
                  return true;
                }
                if (
                  (reg.includes("design") || reg.includes("ui") || reg.includes("ux")) &&
                  (title.includes("design") || title.includes("ui") || title.includes("ux") || track.includes("design") || track.includes("ui"))
                ) {
                  return true;
                }
                if (reg.includes("mobile") && (title.includes("mobile") || track.includes("mobile"))) return true;
                if (reg.includes("python") && (title.includes("python") || track.includes("python"))) return true;

                return false;
              });
            });
        }

        setCourses(filtered);
      } catch (err) {
        console.error("LMS loader error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCoursesAndProgress();
  }, [bootcampRegs, session]);

  // Lessons completed handler
  async function toggleLessonComplete(lessonTitle: string) {
    if (!session?.user?.email || !progress) return;
    const completed = progress.lessons_completed || [];
    const isCompleted = completed.includes(lessonTitle);

    const updatedCompleted = isCompleted
      ? completed.filter(x => x !== lessonTitle)
      : [...completed, lessonTitle];

    // Optimistic UI state update
    setProgress({
      ...progress,
      lessons_completed: updatedCompleted
    });

    // Update in database
    await (supabase as any)
      .from("student_progress")
      .upsert({
        student_email: session.user.email,
        lessons_completed: updatedCompleted,
        updated_at: new Date().toISOString()
      }, { onConflict: "student_email" });

    // Update course local state progress bar
    setCourses(prev =>
      prev.map(c => {
        const completedCount = c.lessons.filter(l => updatedCompleted.includes(l)).length;
        const pct = c.lessons.length > 0 ? Math.round((completedCount / c.lessons.length) * 100) : 0;
        return {
          ...c,
          progress: pct,
          lessonsCompleted: completedCount
        };
      })
    );

    // Update selected course state to update reader layout too
    setSelectedCourse(prev => {
      if (!prev) return null;
      const completedCount = prev.lessons.filter(l => updatedCompleted.includes(l)).length;
      const pct = prev.lessons.length > 0 ? Math.round((completedCount / prev.lessons.length) * 100) : 0;
      return {
        ...prev,
        progress: pct,
        lessonsCompleted: completedCount
      };
    });
  }

  // Attendance Mode Switcher
  async function toggleAttendanceMode() {
    if (!session?.user?.email || !progress) return;
    const currentMode = progress.attendance_mode || "physical";
    const nextMode = currentMode === "physical" ? "online" : "physical";

    setProgress({
      ...progress,
      attendance_mode: nextMode
    });

    const { error } = await (supabase as any)
      .from("student_progress")
      .upsert({
        student_email: session.user.email,
        attendance_mode: nextMode,
        updated_at: new Date().toISOString()
      }, { onConflict: "student_email" });

    if (error) {
      toast.error("Could not save attendance preference.");
    } else {
      toast.success(`Attendance mode switched to ${nextMode.toUpperCase()} successfully!`);
    }
  }

  // Quiz submission handler
  async function submitQuiz(quizId: string, questions: any[]) {
    if (!session?.user?.email || !progress) return;

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.answer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setQuizScoreFeedback(score);

    const updatedScores = {
      ...(progress.quiz_scores || {}),
      [quizId]: score
    };

    setProgress({
      ...progress,
      quiz_scores: updatedScores
    });

    await (supabase as any)
      .from("student_progress")
      .upsert({
        student_email: session.user.email,
        quiz_scores: updatedScores,
        updated_at: new Date().toISOString()
      }, { onConflict: "student_email" });
  }

  if (selectedCourse) {
    const lessons = selectedCourse.lessons || [];
    const activeLesson = lessons[activeLessonIndex] || "No lessons";

    return (
      <div className="flex flex-col gap-6">
        {/* Back header */}
        <section className="bg-card rounded-2xl ring-1 ring-ink/10 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedCourse(null);
                setQuizScoreFeedback(null);
                setQuizAnswers({});
              }}
              className="text-xs text-brand hover:underline font-semibold uppercase tracking-wider flex items-center gap-1"
            >
              &larr; Back to My Courses
            </button>
            <span className="text-xs text-ink/50 font-medium">{selectedCourse.duration} Track</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-serif tracking-tight text-ink">{selectedCourse.title}</h2>
              <p className="text-xs text-ink/65 mt-1">Instructor: {selectedCourse.instructor}</p>
            </div>
            {/* Progress bar */}
            <div className="w-full md:w-64">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink/60">Syllabus Completion</span>
                <span className="font-semibold text-brand">{selectedCourse.progress}%</span>
              </div>
              <div className="h-2.5 bg-ink/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${selectedCourse.progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* LMS Player Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel tabs navigation */}
          <div className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("lessons")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "lessons" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <BookOpen className="size-4" /> Syllabus Lessons
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "milestones" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <Award className="size-4" /> Roadmap Milestones
            </button>
            <button
              onClick={() => setActiveTab("quizzes")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "quizzes" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <HelpCircle className="size-4" /> Track Quizzes
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "assignments" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <FileText className="size-4" /> Assignments
            </button>
            <button
              onClick={() => setActiveTab("virtual")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "virtual" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <Video className="size-4" /> Live Classes
            </button>
            <button
              onClick={() => setActiveTab("materials")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "materials" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <Download className="size-4" /> Course Materials
            </button>
            <button
              onClick={() => setActiveTab("sandbox")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 lg:w-full w-auto whitespace-nowrap text-left ${
                activeTab === "sandbox" ? "bg-brand text-brand-foreground" : "bg-card hover:bg-ink/5 ring-1 ring-ink/10"
              }`}
            >
              <Sparkles className="size-4" /> Coding Sandbox
            </button>
          </div>

          {/* Main Content Workspace Panel */}
          <div className="lg:col-span-9 bg-card ring-1 ring-ink/10 rounded-2xl p-6 md:p-8 min-h-[50vh]">
            
            {/* TABS: LESSONS WORKSPACE */}
            {activeTab === "lessons" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Mobile Lessons Dropdown */}
                <div className="block md:hidden w-full">
                  <label htmlFor="mobile-lesson-select" className="block text-xs font-semibold text-ink/55 uppercase tracking-wider mb-1.5">
                    Select Lesson
                  </label>
                  <select
                    id="mobile-lesson-select"
                    value={activeLessonIndex}
                    onChange={(e) => {
                      setActiveLessonIndex(Number(e.target.value));
                      setQuizScoreFeedback(null);
                    }}
                    className="w-full bg-card ring-1 ring-ink/10 rounded-xl p-3.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand transition"
                  >
                    {lessons.map((lesson, idx) => {
                      const isCompleted = progress?.lessons_completed?.includes(lesson);
                      return (
                        <option key={lesson} value={idx}>
                          {idx + 1}. {lesson}{isCompleted ? " (✓)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Desktop Syllabus Checklist */}
                <div className="hidden md:flex md:col-span-4 flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                  <h4 className="font-semibold text-xs text-ink/55 uppercase tracking-wider mb-1">Lessons Index</h4>
                  {lessons.map((lesson, idx) => {
                    const isCompleted = progress?.lessons_completed?.includes(lesson);
                    return (
                      <button
                        key={lesson}
                        onClick={() => {
                          setActiveLessonIndex(idx);
                          setQuizScoreFeedback(null);
                        }}
                        className={`text-left text-xs px-3 py-2.5 rounded-xl font-medium transition flex items-start justify-between gap-2 border ${
                          activeLessonIndex === idx
                            ? "bg-brand/5 border-brand text-brand font-semibold"
                            : "border-transparent bg-surface hover:bg-ink/5 text-ink/80"
                        }`}
                      >
                        <span className="truncate">{idx + 1}. {lesson}</span>
                        {isCompleted && <CheckCircle className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Active Lesson Reader content */}
                <div className="md:col-span-8 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-ink/10 pt-4 md:pt-0 md:pl-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] text-brand uppercase font-bold tracking-widest">Lesson {activeLessonIndex + 1}</span>
                      <h3 className="font-semibold text-lg text-ink mt-0.5">{activeLesson}</h3>
                    </div>
                  </div>

                  <div className="bg-surface ring-1 ring-ink/5 rounded-xl p-4 md:p-6 text-sm text-ink/75 leading-relaxed min-h-[24vh] flex flex-col justify-between">
                    <div>
                      <p className="font-medium text-ink/90 mb-3">Summit Learning Syllabus Material</p>
                      <p className="mb-4">
                        Welcome to your online class for the Computing Synergy Summit track. This lesson introduces the fundamental concepts of {selectedCourse.title}. 
                      </p>
                      <p className="text-xs text-ink/50 italic">
                        Reference guidelines, links to reading repositories, and live video code walkthrough classrooms will be shared here as the Summit commences.
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-ink/5 flex justify-between items-center">
                      <button
                        onClick={() => toggleLessonComplete(activeLesson)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                          progress?.lessons_completed?.includes(activeLesson)
                            ? "bg-emerald-500/15 text-emerald-600 hover:opacity-80"
                            : "bg-brand text-brand-foreground hover:opacity-90"
                        }`}
                      >
                        {progress?.lessons_completed?.includes(activeLesson) ? "✓ Completed (Undo)" : "Mark as Completed"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TABS: ROADMAP MILESTONES */}
            {activeTab === "milestones" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink">Learning Roadmap</h3>
                  <p className="text-xs text-ink/50 mt-1">Milestones checked off by your Synergy Summit track instructors.</p>
                </div>

                <div className="relative border-l border-ink/10 pl-6 ml-3 flex flex-col gap-6 mt-2">
                  {(() => {
                    const BACKUP_MILESTONES = [
                      { id: "ms-1", title: "Git & Workspace Setup", description: "Configure your local terminal workspace parameters." },
                      { id: "ms-2", title: "Module 1 Exam Passed", description: "Deliver scoring passmarks on diagnostic tests." },
                      { id: "ms-3", title: "Mid-term Project Submission", description: "Deploy intermediate prototype assets." },
                      { id: "ms-4", title: "Summit Capstone Approved", description: "Complete caps approval from course director." }
                    ];
                    const courseMilestones = selectedCourse.milestones && selectedCourse.milestones.length > 0
                      ? selectedCourse.milestones
                      : BACKUP_MILESTONES;

                    return courseMilestones.map((m: any) => {
                      const status = progress?.milestone_status?.[m.id] || "pending";
                      return (
                        <div key={m.id} className="relative">
                          {/* Dot indicator */}
                          <div className={`absolute -left-[31px] top-1 size-4 rounded-full ring-4 ring-card flex items-center justify-center ${
                            status === "completed"
                              ? "bg-emerald-500"
                              : status === "in_progress"
                                ? "bg-amber-500 animate-pulse"
                                : "bg-ink/20"
                          }`} />
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {m.title}
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : status === "in_progress"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-ink/10 text-ink/50"
                              }`}>
                                {status === "completed" ? "Approved" : status === "in_progress" ? "In Progress" : "Pending"}
                              </span>
                            </div>
                            {m.description && <p className="text-xs text-ink/65 mt-1 leading-relaxed max-w-xl">{m.description}</p>}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* TABS: QUIZZES */}
            {activeTab === "quizzes" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink font-serif">Module Quizzes</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Topic: <span className="font-semibold text-brand">{selectedCourse.lessons[activeLessonIndex]}</span>
                  </p>
                </div>

                {loadingExtra ? (
                  <div className="text-xs text-ink/40 py-4"><Loader2 className="size-4 animate-spin inline mr-2" /> Loading module quizzes...</div>
                ) : dbQuizzes.length === 0 ? (
                  <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-ink/10 text-xs text-ink/50">
                    No quizzes published yet for this module.
                  </div>
                ) : (
                  dbQuizzes.map((quiz) => {
                    const savedScore = progress?.quiz_scores?.[quiz.id];
                    const hasTaken = typeof savedScore === "number";

                    return (
                      <div key={quiz.id} className="bg-surface ring-1 ring-ink/10 rounded-xl p-5 md:p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-semibold text-base text-ink">{quiz.title}</h4>
                            <p className="text-xs text-ink/55 mt-0.5">Test your understanding of this lesson module.</p>
                          </div>
                          {hasTaken && (
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-ink/40 uppercase font-semibold block">Last Score</span>
                              <span className={`text-lg font-bold ${savedScore >= 70 ? "text-emerald-500" : "text-amber-500"}`}>{savedScore}%</span>
                            </div>
                          )}
                        </div>

                        {quizScoreFeedback !== null ? (
                          <div className="p-4 bg-brand/5 ring-1 ring-brand/20 rounded-xl flex flex-col items-center justify-center gap-2 text-center py-6">
                            <Award className="size-10 text-brand animate-bounce" />
                            <h5 className="font-semibold text-ink text-sm">Quiz Submitted!</h5>
                            <p className="text-xs text-ink/60 max-w-[28ch]">You scored <strong>{quizScoreFeedback}%</strong> on this assessment.</p>
                            <button
                              onClick={() => {
                                setQuizScoreFeedback(null);
                                setQuizAnswers({});
                              }}
                              className="mt-2 text-xs font-semibold text-brand hover:underline"
                            >
                              Retake Quiz &rarr;
                            </button>
                          </div>
                        ) : hasTaken ? (
                          <div className="text-xs text-ink/55 bg-card border border-ink/5 p-3 rounded-xl">
                            You have already submitted this assessment. You scored <strong>{savedScore}%</strong>. If you wish to retake it:
                            <button
                              onClick={() => {
                                setQuizScoreFeedback(null);
                                setQuizAnswers({});
                                setProgress(prev => {
                                  if (!prev) return null;
                                  const nextScores = { ...prev.quiz_scores };
                                  delete nextScores[quiz.id];
                                  return { ...prev, quiz_scores: nextScores };
                                });
                              }}
                              className="block mt-2 font-bold text-brand hover:underline"
                            >
                              Retake Quiz Assessment
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 border-t border-ink/5 pt-4">
                            {(quiz.questions || []).map((q: any, qidx: number) => (
                              <div key={qidx} className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-ink/80">{qidx + 1}. {q.question}</p>
                                <div className="grid gap-2 pl-2">
                                  {(q.options || []).map((opt: string, oidx: number) => (
                                    <label key={oidx} className="flex items-center gap-2 text-xs cursor-pointer hover:text-brand transition select-none">
                                      <input
                                        type="radio"
                                        name={`q-${quiz.id}-${qidx}`}
                                        checked={quizAnswers[qidx] === oidx}
                                        onChange={() => setQuizAnswers(prev => ({ ...prev, [qidx]: oidx }))}
                                        className="accent-brand size-3.5 shrink-0"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}

                            <button
                              onClick={() => submitQuiz(quiz.id, quiz.questions)}
                              disabled={Object.keys(quizAnswers).length < (quiz.questions || []).length}
                              className="self-start mt-2 px-5 py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50"
                            >
                              Submit Assessment
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TABS: ASSIGNMENTS */}
            {activeTab === "assignments" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink font-serif font-semibold">Module Tasks & Assignments</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Lesson: <span className="font-semibold text-brand">{selectedCourse.lessons[activeLessonIndex]}</span>
                  </p>
                </div>

                {loadingExtra ? (
                  <div className="text-xs text-ink/40 py-4"><Loader2 className="size-4 animate-spin inline mr-2" /> Loading assignments...</div>
                ) : dbAssignments.length === 0 ? (
                  <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-ink/10 text-xs text-ink/50">
                    No assignments published for this module yet.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {dbAssignments.map((assignment) => {
                      const submission = submissions.find(s => s.assignment_id === assignment.id);
                      const isGraded = submission && submission.grade !== null;

                      return (
                        <div key={assignment.id} className="bg-surface ring-1 ring-ink/10 rounded-xl p-5 md:p-6 space-y-4">
                          <div>
                            <div className="flex justify-between items-start gap-3 flex-wrap">
                              <h4 className="font-semibold text-base text-ink">{assignment.title}</h4>
                              <span className="text-[10px] font-mono uppercase bg-brand/10 text-brand px-2 py-0.5 rounded">
                                Max Score: {assignment.max_points} points
                              </span>
                            </div>
                            <p className="text-xs text-ink/70 mt-2 font-mono whitespace-pre-wrap bg-card p-3 rounded-lg border border-ink/5 leading-relaxed">
                              {assignment.description}
                            </p>
                          </div>

                          {submission ? (
                            <div className="border-t border-ink/5 pt-4 space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-ink/75">Your Submission:</span>
                                {isGraded ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono font-bold text-[10px]">
                                    Graded Score: {submission.grade} / {assignment.max_points}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-mono font-bold text-[10px]">
                                    Submitted (Pending Grade Comments)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-ink/65 bg-card p-3 rounded-lg border border-ink/5 whitespace-pre-wrap italic">
                                "{submission.submission_text}"
                              </p>
                              {submission.feedback && (
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs">
                                  <span className="font-semibold text-emerald-700 block">Director Feedback:</span>
                                  <p className="text-ink/75 mt-1">"{submission.feedback}"</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!assignText.trim() || !session?.user?.email) return;
                                setSubmittingAssign(assignment.id);
                                const { error } = await (supabase as any)
                                  .from("assignment_submissions")
                                  .insert({
                                    assignment_id: assignment.id,
                                    student_email: session.user.email,
                                    submission_text: assignText.trim(),
                                    submitted_at: new Date().toISOString()
                                  });
                                setSubmittingAssign(null);
                                if (!error) {
                                  toast.success("Assignment submitted successfully!");
                                  setAssignText("");
                                  const { data: s } = await (supabase as any)
                                    .from("assignment_submissions")
                                    .select("*")
                                    .eq("student_email", session.user.email)
                                    .in("assignment_id", dbAssignments.map(x => x.id));
                                  setSubmissions(s ?? []);
                                } else {
                                  toast.error("Could not submit assignment.");
                                }
                              }}
                              className="border-t border-ink/5 pt-4 space-y-3"
                            >
                              <div>
                                <label className="text-[11px] text-ink/55 block font-semibold mb-1">Your Solution/Submission</label>
                                <textarea
                                  required
                                  rows={4}
                                  placeholder="Type your response, links to repository files, or solution summary details here..."
                                  value={assignText}
                                  onChange={(e) => setAssignText(e.target.value)}
                                  className="w-full bg-card ring-1 ring-ink/10 rounded-xl p-3 text-xs text-ink focus:outline-none focus:ring-brand"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={submittingAssign === assignment.id}
                                className="px-4 py-2 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50"
                              >
                                {submittingAssign === assignment.id ? "Submitting..." : "Submit Solution"}
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TABS: VIRTUAL CLASSES / LIVE */}
            {activeTab === "virtual" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink font-serif">Virtual Sessions & Night Classes</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Lesson Module: <span className="font-semibold text-brand">{selectedCourse.lessons[activeLessonIndex]}</span>
                  </p>
                </div>

                {/* Attendance Preference Switcher component */}
                <div className="bg-surface ring-1 ring-ink/10 rounded-xl p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-ink">Attendance Preference Mode</h4>
                    <p className="text-xs text-ink/60 mt-1">
                      Are you registered for physical classes but need to attend online today? Toggle your mode below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded uppercase tracking-wider ${
                      (progress as any)?.attendance_mode === "online" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                    }`}>
                      {(progress as any)?.attendance_mode === "online" ? "Online Mode" : "Physical Attendance"}
                    </span>
                    <button
                      onClick={toggleAttendanceMode}
                      className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition"
                    >
                      Switch to {(progress as any)?.attendance_mode === "physical" || !(progress as any)?.attendance_mode ? "Online" : "Physical"}
                    </button>
                  </div>
                </div>

                {/* Live classes list */}
                {loadingExtra ? (
                  <div className="text-xs text-ink/40 py-4"><Loader2 className="size-4 animate-spin inline mr-2" /> Loading live sessions...</div>
                ) : dbVirtualClasses.length === 0 ? (
                  <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-ink/10 text-xs text-ink/50">
                    No virtual sessions scheduled for this module yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {dbVirtualClasses.map((vc) => {
                      const isOnline = (progress as any)?.attendance_mode === "online";
                      return (
                        <div key={vc.id} className="p-4 bg-surface ring-1 ring-ink/10 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                              {vc.title}
                              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                                vc.session_type === "night" ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"
                              }`}>
                                {vc.session_type === "night" ? "🌙 Night" : "☀️ General"}
                              </span>
                            </div>
                            <p className="text-[10px] text-ink/40 font-mono mt-0.5">Time: {new Date(vc.meeting_time).toLocaleString()}</p>
                            <div className="mt-1 flex items-center">
                              <a
                                href={getGoogleCalendarLink(`OKIKE Class: ${vc.title}`, vc.meeting_time, vc.meeting_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[10px] text-brand hover:underline font-semibold"
                              >
                                <Calendar className="size-3" /> Add to Google Calendar
                              </a>
                            </div>
                          </div>

                          {isOnline ? (
                            <a
                              href={vc.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 shrink-0 text-center"
                            >
                              Join Class Link &rarr;
                            </a>
                          ) : (
                            <div className="text-xs text-ink/40 text-right italic max-w-[20ch]">
                              Switch mode to Online to join this live session.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TABS: COURSE MATERIALS */}
            {activeTab === "materials" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink font-serif">Module Resources & Materials</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Lesson: <span className="font-semibold text-brand">{selectedCourse.lessons[activeLessonIndex]}</span>
                  </p>
                </div>

                {loadingExtra ? (
                  <div className="text-xs text-ink/40 py-4"><Loader2 className="size-4 animate-spin inline mr-2" /> Loading resources...</div>
                ) : dbCourseMaterials.length === 0 ? (
                  <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-ink/10 text-xs text-ink/50">
                    No resources uploaded by the instructor for this module yet.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {dbCourseMaterials.map((m) => (
                      <div key={m.id} className="bg-surface ring-1 ring-ink/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-ink">{m.title}</div>
                          {m.description && <p className="text-[10px] text-ink/60 mt-1">{m.description}</p>}
                        </div>
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-brand text-brand-foreground font-semibold text-[10px] uppercase tracking-wider hover:opacity-90 text-center shrink-0 w-full sm:w-auto"
                        >
                          Download Resource
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TABS: CODING SANDBOX */}
            {activeTab === "sandbox" && (
              <SandboxTab
                courseTitle={selectedCourse.title}
                lessonTitle={selectedCourse.lessons[activeLessonIndex] || "General"}
              />
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Header */}
      <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <GraduationCap className="size-5 text-brand" />
              My Learning
            </h2>
            <p className="text-ink/60 text-sm mt-1">Track your progress and continue learning</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCertificateCourse("Git Workspace & Web Fundamentals")}
              className="inline-flex items-center gap-2 rounded-xl bg-surface hover:bg-ink/5 ring-1 ring-ink/10 px-4 py-2.5 text-xs font-semibold text-ink/75 transition cursor-pointer"
            >
              <Award className="size-4 text-brand animate-pulse" /> Test Certificate Design
            </button>
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
            >
              Browse all courses <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Award className="size-4 text-brand" />
            <span className="text-[11px] uppercase tracking-widest text-ink/60">Total Courses</span>
          </div>
          <div className="text-2xl font-semibold">{courses.length}</div>
          <div className="text-xs text-ink/50">available courses</div>
        </div>
        <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="size-4 text-emerald-500" />
            <span className="text-[11px] uppercase tracking-widest text-ink/60">Enrolled</span>
          </div>
          <div className="text-2xl font-semibold">
            {courses.filter((c) => c.status === "enrolled").length}
          </div>
          <div className="text-xs text-ink/50">active courses</div>
        </div>
        <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="size-4 text-amber-500" />
            <span className="text-[11px] uppercase tracking-widest text-ink/60">Lessons</span>
          </div>
          <div className="text-2xl font-semibold">
            {courses.reduce((sum, course) => sum + (course.lessons?.length || 0), 0)}
          </div>
          <div className="text-xs text-ink/50">total lessons</div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink/80">Your Courses</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-ink/50">Loading courses...</div>
        ) : courses.length === 0 ? (
          isRegistered ? (
            <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-8 text-center flex flex-col items-center gap-4 max-w-lg mx-auto mt-4">
              <GraduationCap className="size-12 text-brand/40" />
              <h3 className="font-semibold text-lg text-ink">Curriculum Coming Soon</h3>
              <p className="text-sm text-ink/65 leading-relaxed">
                You are registered for the <strong>{registeredTrack}</strong> track. Your syllabus is currently being set up by the instructors. Check back soon!
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-8 text-center flex flex-col items-center gap-4 max-w-lg mx-auto mt-4">
              <GraduationCap className="size-12 text-brand/40" />
              <h3 className="font-semibold text-lg text-ink">No Enrolled Courses</h3>
              <p className="text-sm text-ink/65 leading-relaxed">
                Unlock your course dashboard and access tech track learning materials by registering for the upcoming Computing Synergy Summit 2026.
              </p>
              <Link
                to="/bootcamp"
                className="mt-2 bg-brand text-brand-foreground px-6 py-3.5 rounded-xl font-semibold text-xs uppercase tracking-widest hover:opacity-90 transition inline-flex items-center gap-2"
              >
                Register for the Summit &rarr;
              </Link>
            </div>
          )
        ) : (
          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className={`rounded-2xl bg-card ring-1 transition-all ring-ink/10 p-6 cursor-pointer hover:ring-brand/20`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${course.status === "enrolled"
                          ? "bg-brand/15 text-brand"
                          : course.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-ink/10 text-ink/60"
                          }`}
                      >
                        {course.status}
                      </span>
                      <span className="text-xs text-ink/50">• {course.duration}</span>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{course.title}</h4>
                    <p className="text-sm text-ink/60 mb-4">{course.track}</p>

                    {course.lessons &&
                      course.lessons.length > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-ink/60">
                              {course.lessonsCompleted || 0}/{course.lessons.length} lessons
                            </span>
                            <span className="font-semibold text-brand">{course.progress}%</span>
                          </div>
                          <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all duration-300"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                    {course.status === "enrolled" &&
                      course.lessons &&
                      course.lessons.length > 0 && (
                        <div className="flex items-center justify-between pt-3 border-t border-ink/10">
                          <div className="flex items-center gap-2 text-sm text-ink/60">
                            <Clock className="size-4" />
                            Lessons: {course.lessons.length}
                          </div>
                          <button className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-brand-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">
                            <Play className="size-3" /> Start learning
                          </button>
                        </div>
                      )}

                    {course.status === "completed" && (
                      <div className="flex items-center justify-between pt-3 border-t border-ink/10">
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                          <CheckCircle className="size-4" />
                          Graduated
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCertificateCourse(course.title);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <Award className="size-3.5" /> View Certificate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {certificateCourse && (
        <CertificateModal
          courseTitle={certificateCourse}
          studentName={fullName}
          onClose={() => setCertificateCourse(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsView({
  email,
  fullName,
  user,
  role,
}: {
  email: string;
  fullName: string;
  user: any;
  role: string | null;
}) {
  const sendEmailAlert = useServerFn(sendPasswordChangedEmail);
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "security">("profile");

  // Profile states
  const [name, setName] = useState(fullName);
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [github, setGithub] = useState(user?.user_metadata?.github || "");
  const [linkedin, setLinkedin] = useState(user?.user_metadata?.linkedin || "");
  const [portfolioUrl, setPortfolioUrl] = useState(user?.user_metadata?.portfolio_url || "");
  const [resumeUrl, setResumeUrl] = useState(user?.user_metadata?.resume_url || "");
  const [attendanceMode, setAttendanceMode] = useState(user?.user_metadata?.attendance_preference || "physical");

  // Client states
  const [companyName, setCompanyName] = useState(user?.user_metadata?.company_name || "");
  const [billingAddress, setBillingAddress] = useState(user?.user_metadata?.billing_address || "");
  const [billingEmail, setBillingEmail] = useState(user?.user_metadata?.billing_email || "");
  const [taxId, setTaxId] = useState(user?.user_metadata?.tax_id || "");
  const [preferredCurrency, setPreferredCurrency] = useState(user?.user_metadata?.preferred_currency || "NGN");

  // Notification states
  const savePushSub = useServerFn(savePushSubscription);
  const [notifyClasses, setNotifyClasses] = useState(true);
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyMilestones, setNotifyMilestones] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyBilling, setNotifyBilling] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  async function handleEnablePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Push notifications are not supported by your browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushEnabled(true);
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicVapidKey,
          });
        }
        await savePushSub({ data: { userId: user?.id || "", subscription } });
        toast.success("Push notifications enabled!");
      } else {
        toast.error("Permission denied for push notifications.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enable push notifications.");
    }
  }

  // Security states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      // Update Auth Metadata
      const metadataUpdates: any = {
        full_name: name,
        phone,
        github,
        linkedin,
        portfolio_url: portfolioUrl,
        resume_url: resumeUrl,
        attendance_preference: attendanceMode,
        company_name: companyName,
        billing_address: billingAddress,
        billing_email: billingEmail,
        tax_id: taxId,
        preferred_currency: preferredCurrency,
      };

      const { error: authErr } = await supabase.auth.updateUser({
        data: metadataUpdates
      });

      if (authErr) throw authErr;

      // Sync with profiles table
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          full_name: name,
        })
        .eq("user_id", user?.id);

      if (dbErr) throw dbErr;

      toast.success("Profile settings updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNotificationsSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          notify_classes: notifyClasses,
          notify_assignments: notifyAssignments,
          notify_milestones: notifyMilestones,
          notify_billing: notifyBilling,
        }
      });

      if (error) throw error;
      toast.success("Notification preferences saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSecurityBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSecurityBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      await sendEmailAlert({ data: { email } }).catch(() => {});
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleLogoutOthers() {
    setSecurityBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSecurityBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Successfully logged out from all other devices!");
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Navigation panel */}
        <aside className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 p-1 bg-surface ring-1 ring-ink/5 rounded-2xl md:bg-transparent md:ring-0">
          {[
            { key: "profile", label: role === "client" ? "Studio Settings" : "Student Settings" },
            { key: "notifications", label: "Notifications" },
            { key: "security", label: "Security & Sessions" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 md:flex-none text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all select-none cursor-pointer ${
                activeTab === tab.key
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-ink/65 hover:text-ink hover:bg-ink/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content panel */}
        <div className="flex-grow w-full">
          {/* PROFILE / INVOICING SETTINGS */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSave} className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-ink">
                  {role === "client" ? "Studio Client Profile" : "Student profile details"}
                </h3>
                <p className="text-xs text-ink/50 mt-1">
                  Manage your display settings, social links, and career status.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Full Name</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Phone / WhatsApp</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                  />
                </label>
              </div>

              {/* Student specific fields */}
              {role !== "client" && (
                <div className="space-y-6 pt-4 border-t border-ink/5">
                  <div>
                    <h4 className="font-semibold text-sm text-ink mb-1">Career & Academic Directory</h4>
                    <p className="text-[10px] text-ink/50">Provide reference links for certificates and hiring dashboards.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">GitHub URL</span>
                      <input
                        type="url"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        placeholder="https://github.com/yourusername"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">LinkedIn URL</span>
                      <input
                        type="url"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/yourusername"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Portfolio Website</span>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://yourportfolio.com"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Resume / CV Link</span>
                      <input
                        type="url"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Default Attendance Preference</span>
                      <select
                        value={attendanceMode}
                        onChange={(e) => setAttendanceMode(e.target.value)}
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      >
                        <option value="physical">Physical Classroom Attendance</option>
                        <option value="online">Online Virtual / Night Session Only</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* Client specific fields */}
              {role === "client" && (
                <div className="space-y-6 pt-4 border-t border-ink/5">
                  <div>
                    <h4 className="font-semibold text-sm text-ink mb-1">Company Invoicing Details</h4>
                    <p className="text-[10px] text-ink/50">Configure metadata applied automatically to invoices and statements.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Company Name</span>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Corp"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Billing Email</span>
                      <input
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        placeholder="finance@acme.com"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Tax / VAT ID</span>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="VAT-123456"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Billing Currency</span>
                      <select
                        value={preferredCurrency}
                        onChange={(e) => setPreferredCurrency(e.target.value)}
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                      >
                        <option value="NGN">NGN (₦) - Naira</option>
                        <option value="USD">USD ($) - US Dollar</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Billing Address</span>
                      <textarea
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        rows={2}
                        placeholder="123 Studio Blvd, Lagos, Nigeria"
                        className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition resize-none"
                      />
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-brand text-brand-foreground py-3 font-semibold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition rounded-xl cursor-pointer"
              >
                {busy ? "Saving Settings…" : "Save Changes"}
              </button>
            </form>
          )}

          {/* NOTIFICATION SETTINGS */}
          {activeTab === "notifications" && (
            <div className="flex flex-col gap-6">
              <form onSubmit={handleNotificationsSave} className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink">Notification Preferences</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Choose how and when you want to receive alerts from our platform.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      state: notifyClasses,
                      setter: setNotifyClasses,
                      title: "Virtual Sessions & Live Reminders",
                      desc: "Receive email alerts 1 hour before scheduled night classes or live syllabus tutorials starts."
                    },
                    {
                      state: notifyAssignments,
                      setter: setNotifyAssignments,
                      title: "Syllabus Assignments & Materials",
                      desc: "Get notified when instructors upload new coding materials or publish module assignments."
                    },
                    {
                      state: notifyMilestones,
                      setter: setNotifyMilestones,
                      title: "Project Progress & Milestones",
                      desc: "Receive immediate updates when your project milestones are approved by the director."
                    },
                    {
                      state: notifyBilling,
                      setter: setNotifyBilling,
                      title: "Billing & Receipts",
                      desc: "Get invoice deposit invoices, transaction alerts, and print ticket confirmations."
                    }
                  ].map((item, index) => (
                    <label key={index} className="flex gap-4 p-4 bg-surface rounded-xl border border-ink/5 cursor-pointer hover:border-brand/30 transition duration-300">
                      <input
                        type="checkbox"
                        checked={item.state}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="size-4 mt-0.5 accent-brand rounded border-ink/10 focus:ring-0"
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-ink block">{item.title}</span>
                        <span className="text-[11px] text-ink/50 leading-relaxed block">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                    
                    {/* Push Notifications (PWA) Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-ink/10 bg-surface/50">
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="font-semibold text-sm text-ink">Background Push Notifications (PWA)</span>
                        <span className="text-xs text-ink/60">Receive alerts even when the app is closed. Requires browser permission.</span>
                      </div>
                      {pushEnabled ? (
                        <div className="text-xs font-bold text-brand flex items-center gap-1">
                          <CheckCircle2 className="size-4" /> Enabled
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleEnablePush}
                          className="shrink-0 px-4 py-2 bg-brand/10 text-brand rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-brand/20 transition"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-brand text-brand-foreground py-3 font-semibold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition rounded-xl cursor-pointer"
                >
                  {busy ? "Saving Settings…" : "Save Notification Preferences"}
                </button>
              </form>

              <EmailAutomationLogs />
            </div>
          )}

          {/* SECURITY & SESSIONS */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Change Password Form */}
              <form onSubmit={handlePasswordChange} className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink">Change Password</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Update your account password. Must be at least 6 characters.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">New Password</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">Confirm New Password</span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={securityBusy}
                  className="w-full bg-brand text-brand-foreground py-3 font-semibold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition rounded-xl cursor-pointer"
                >
                  {securityBusy ? "Updating Password…" : "Update Password"}
                </button>
              </form>

              {/* Sessions Management */}
              <section className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="font-semibold text-lg text-ink">Advanced Session Control</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Sign out of other browsers or mobile sessions linked to this account.
                  </p>
                </div>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                  <Shield className="size-5 text-brand mt-0.5 shrink-0" />
                  <div className="text-xs text-ink/75 leading-relaxed">
                    <strong>Logged in on multiple devices?</strong> If you suspect unauthorized access or have finished working on shared networks, you can securely clear all other sessions in one click.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={securityBusy}
                  onClick={handleLogoutOthers}
                  className="w-full py-3 border border-red-500/30 text-red-500 hover:bg-red-500/5 font-semibold text-xs uppercase tracking-widest transition rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {securityBusy ? "Clearing Sessions…" : "Log Out of All Other Devices"}
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- AIInsightsCard ---------------- */

type InsightItem = {
  id: string;
  severity: "warning" | "info";
  title: string;
  message: string;
};

function AIInsightsCard({
  projects,
  milestones,
  updates,
}: {
  projects: Project[];
  milestones: Milestone[];
  updates: Update[];
}) {
  const getInsights = useServerFn(generateInsights);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "hidden">("idle");
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projects.length === 0) return;
    setStatus("loading");

    let aborted = false;
    const timeoutId = setTimeout(() => {
      aborted = true;
      setStatus("hidden");
    }, 10_000);

    getInsights({
      data: {
        projects,
        milestones: milestones.map((m) => ({
          id: m.id,
          project_id: m.project_id,
          name: m.name,
          status: m.status,
          created_at: new Date().toISOString(),
        })),
        updates,
      },
    })
      .then((result: any) => {
        if (aborted) return;
        clearTimeout(timeoutId);
        if (result.ok) {
          // Sort: warning first, then info; within each severity by id (deterministic)
          const sorted = [...result.insights].sort((a, b) => {
            if (a.severity === b.severity) return a.id.localeCompare(b.id);
            return a.severity === "warning" ? -1 : 1;
          });
          setInsights(sorted);
          setStatus("done");
        } else {
          setStatus("hidden");
        }
      })
      .catch(() => {
        if (!aborted) {
          clearTimeout(timeoutId);
          setStatus("hidden");
        }
      });

    return () => {
      aborted = true;
      clearTimeout(timeoutId);
    };
  }, []); // intentionally run once on mount

  const visible = insights.filter((i) => !dismissed.has(i.id)).slice(0, 3);

  if (status === "hidden") return null;
  if (status === "done" && visible.length === 0) return null;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-ink/10 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-brand" />
        <h3 className="font-semibold text-sm">AI Insights</h3>
      </div>

      {status === "loading" && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-ink/5 animate-pulse" />
          ))}
        </div>
      )}

      {status === "done" && (
        <ul className="space-y-3">
          {visible.map((insight) => (
            <li
              key={insight.id}
              className={`rounded-xl p-3 ring-1 flex items-start gap-3 ${insight.severity === "warning"
                ? "bg-amber-50 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20"
                : "bg-brand/5 ring-brand/15"
                }`}
            >
              <div className="shrink-0 mt-0.5">
                {insight.severity === "warning" ? (
                  <Flag className="size-4 text-amber-500" />
                ) : (
                  <Sparkles className="size-4 text-brand" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{insight.title}</div>
                <div className="text-xs text-ink/60 mt-0.5">{insight.message}</div>
              </div>
              <button
                onClick={() => setDismissed((d) => new Set([...d, insight.id]))}
                className="shrink-0 text-ink/30 hover:text-ink/60 transition"
                aria-label="Dismiss insight"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Bits ---------------- */

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-4">
      <div className="text-[11px] text-ink/60">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1">{value}</div>
      <div className="text-[11px] text-ink/50 mt-1">{sub}</div>
    </div>
  );
}

function EmptyView({
  title,
  subtitle,
  ctaLabel,
  ctaTo,
  onClickCta,
}: {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaTo?: string;
  onClickCta?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-ink/10 p-12 text-center">
      <Inbox className="size-8 text-ink/30 mx-auto mb-3" />
      <div className="text-lg font-medium">{title}</div>
      <p className="text-sm text-ink/50 mt-2 max-w-md mx-auto">{subtitle}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-2 mt-5 rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
        >
          {ctaLabel} <ArrowRight className="size-4" />
        </Link>
      )}
      {ctaLabel && onClickCta && (
        <button
          type="button"
          onClick={onClickCta}
          className="inline-flex items-center gap-2 mt-5 rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 cursor-pointer"
        >
          {ctaLabel} <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}

/* ---------------- Mobile Bottom Nav with More drawer ---------------- */

function MobileBottomNav({
  section,
  setSection,
  role,
}: {
  section: Section;
  setSection: (s: Section) => void;
  role: string | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary: { key: Section; icon: LucideIcon; label: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home" },
    { key: "projects", icon: FolderKanban, label: "Projects" },
    { key: "ai", icon: Sparkles, label: "AI" },
    { key: "courses", icon: BookOpen, label: "Courses" },
  ];

  const more: { key: Section; icon: LucideIcon; label: string }[] = [
    { key: "messages", icon: MessageSquare, label: "Messages" },
    { key: "files", icon: FileText, label: "Files" },
    { key: "calendar", icon: Calendar, label: "Calendar" },
    { key: "milestones", icon: Flag, label: "Milestones" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  // Is the active section one of the "more" items?
  const moreIsActive = more.some((m) => m.key === section);

  function pick(key: Section) {
    setSection(key);
    setMoreOpen(false);
  }

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-ink/50"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="lg:hidden fixed bottom-[60px] inset-x-0 z-50 bg-card border border-ink/10 rounded-t-2xl shadow-2xl px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink/50">More</span>
            <button onClick={() => setMoreOpen(false)} className="p-1 text-ink/50 hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {more.map(({ key, icon: Icon, label }) => {
              const active = section === key;
              return (
                <button
                  key={key}
                  onClick={() => pick(key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition ${active
                    ? "bg-brand/15 text-brand ring-1 ring-brand/25"
                    : "bg-ink/5 text-ink/60 hover:bg-ink/10 hover:text-ink"
                    }`}
                >
                  <Icon className="size-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                </button>
              );
            })}

            {/* Custom Links for Console views */}
            {(role === "instructor" || role === "admin") && (
              <Link
                to="/instructor"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand/15 transition text-center"
              >
                <GraduationCap className="size-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Instructor</span>
              </Link>
            )}

            {role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand/15 transition text-center"
              >
                <Shield className="size-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Admin</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-ink/10 flex items-stretch">
        {primary.map(({ key, icon: Icon, label }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => { setMoreOpen(false); setSection(key); }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition ${active ? "text-brand" : "text-ink/45 hover:text-ink/70"
                }`}
            >
              <Icon className={`size-5 ${active ? "text-brand" : ""}`} />
              {label}
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition ${moreIsActive || moreOpen ? "text-brand" : "text-ink/45 hover:text-ink/70"
            }`}
        >
          <MoreHorizontal className={`size-5 ${moreIsActive || moreOpen ? "text-brand" : ""}`} />
          More
        </button>
      </nav>
    </>
  );
}

function SandboxTab({ courseTitle, lessonTitle }: { courseTitle: string; lessonTitle: string }) {
  const sandboxUrl = `/sandbox?title=${encodeURIComponent(lessonTitle)}&html=${encodeURIComponent("<!-- " + lessonTitle + " Practice -->\n<h1>" + lessonTitle + " Sandbox</h1>\n<p>Start writing code here...</p>")}`;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-surface rounded-2xl border border-dashed border-ink/15 my-6 max-w-xl mx-auto shadow-sm">
      <div className="size-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-4">
        <Sparkles className="size-7 animate-pulse text-[#7c3aed]" />
      </div>
      <h3 className="font-semibold text-lg text-ink font-serif">Dedicated Code Sandbox</h3>
      <p className="text-xs text-ink/65 mt-2 max-w-[42ch] leading-relaxed">
        We have designed a premium fullscreen interactive code editor playground. Write HTML, CSS, and JS side-by-side with your <strong>{lessonTitle}</strong> module.
      </p>
      
      <a
        href={sandboxUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand text-brand-foreground px-6 py-3 text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-purple-500/10 active:scale-95 transition"
      >
        Launch Fullscreen Editor ❯
      </a>
      
      <span className="text-[10px] text-ink/40 mt-3 font-medium">Opens in a new browser tab</span>
    </div>
  );
}

function EmailAutomationLogs() {
  const logs = [
    { id: "1", type: "system", title: "Mailing Service Status", status: "online", desc: "Resend API connection initialized successfully." },
    { id: "2", type: "email", title: "Welcome Onboarding Alert", status: "sent", desc: "Sent onboarding instructions to student." },
    { id: "3", type: "email", title: "Summit Print Ticket Confirm", status: "sent", desc: "Generated transaction ticket receipt verification log." },
    { id: "4", type: "email", title: "Project Proposal Invoice", status: "sent", desc: "Dispatched package deposit invoice details to client." }
  ];

  return (
    <section className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8 space-y-4 text-left">
      <div>
        <h3 className="font-semibold text-base text-ink">Automation & Notification Logs</h3>
        <p className="text-xs text-ink/50 mt-0.5">Real-time tracker of mailings dispatched via Resend integration.</p>
      </div>

      <div className="space-y-3 font-mono text-[10px]">
        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-surface border border-ink/5 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-ink/80 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand" />
                {log.title}
              </div>
              <p className="text-ink/50 mt-0.5">{log.desc}</p>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              log.status === "online" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
            }`}>
              {log.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SupportChatConsole({
  clientName,
  clientEmail,
}: {
  clientName: string;
  clientEmail: string;
}) {
  const [messages, setMessages] = useState<any[]>([
    {
      id: "init-msg",
      sender: "support",
      text: `Hello ${clientName}! Welcome to OKIKE Support. How can we help you with your projects or academy learning today?`,
      time: new Date(Date.now() - 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    if (!clientEmail) return;
    const { data } = await supabase
      .from("contact_messages")
      .select("id, name, email, message, created_at")
      .eq("email", clientEmail)
      .order("created_at", { ascending: true });
    
    if (data && data.length > 0) {
      const formatted = data.map((m) => {
        let sender = "user";
        let text = m.message;
        if (m.name === "OKIKE Support") {
          sender = "support";
        } else if (text.startsWith("[Dashboard Support Ticket]: ")) {
          text = text.replace("[Dashboard Support Ticket]: ", "");
        }
        return {
          id: m.id,
          sender,
          text,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });
      setMessages([
        {
          id: "init-msg",
          sender: "support",
          text: `Hello ${clientName}! Welcome to OKIKE Support. How can we help you with your projects or academy learning today?`,
          time: new Date(Date.now() - 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...formatted
      ]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  useEffect(() => {
    loadMessages();
    
    const channel = supabase
      .channel("support-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages", filter: `email=eq.${clientEmail}` }, (payload) => {
        const m = payload.new as any;
        let sender = m.name === "OKIKE Support" ? "support" : "user";
        let text = m.message;
        if (text.startsWith("[Dashboard Support Ticket]: ")) {
          text = text.replace("[Dashboard Support Ticket]: ", "");
        }
        
        // Prevent adding our own optimistic updates again if they match, though we don't optimistically set ID.
        // For simplicity we just reload all to get consistent IDs or we just append.
        // If it's a support reply, show toast!
        if (sender === "support") {
          toast.info("New message from OKIKE Support", { icon: "💬" });
          setTyping(false);
        }
        
        setMessages((prev) => {
          if (prev.find(x => x.id === m.id)) return prev;
          return [...prev, {
            id: m.id,
            sender,
            text,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
        });
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientEmail]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const userText = text.trim();
    setText("");

    // Optimistic UI
    const tempId = Math.random().toString();
    const userMsg = {
      id: tempId,
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    try {
      await supabase
        .from("contact_messages")
        .insert({
          name: clientName,
          email: clientEmail,
          message: `[Dashboard Support Ticket]: ${userText}`
        });
    } catch (err) {
      console.error("Support sync error:", err);
    }
  }

  return (
    <section className="rounded-2xl bg-card border border-ink/10 flex flex-col h-[calc(100vh-140px)] text-left max-w-4xl mx-auto">
      <div className="px-5 py-4 border-b border-ink/10 flex items-center justify-between gap-3 bg-surface/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h2 className="font-semibold text-sm text-ink">OKIKE Live Developer Support</h2>
        </div>
        <span className="text-[10px] text-ink/50 font-semibold tracking-wider uppercase">Active Queue</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className="flex flex-col gap-1 max-w-[80%]">
              <div
                className={`rounded-2xl px-4 py-2.5 text-xs font-sans leading-relaxed ${
                  m.sender === "user"
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "bg-surface ring-1 ring-ink/10 text-ink"
                }`}
              >
                {m.text}
              </div>
              <span className={`text-[8px] text-ink/40 font-mono ${m.sender === "user" ? "text-right" : "text-left"}`}>
                {m.time}
              </span>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-surface ring-1 ring-border text-ink px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-ink/40 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-ink/40 animate-bounce delay-75" />
              <div className="w-2 h-2 rounded-full bg-ink/40 animate-bounce delay-150" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-ink/10 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a technical question or describe project needs..."
          className="flex-grow rounded-xl bg-surface ring-1 ring-ink/10 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
        />
        <button
          type="submit"
          className="bg-brand text-brand-foreground px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
        >
          Send
        </button>
      </form>
    </section>
  );
}

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.015-5.08-2.859-6.927C16.378 2.032 13.911 1.016 11.99 1.016c-5.407 0-9.813 4.398-9.817 9.8-.001 1.564.423 3.09 1.226 4.453l-1.014 3.702 3.805-.989zM16.5 13.5c-.27-.13-1.59-.785-1.84-.875-.25-.09-.43-.13-.61.13-.18.26-.71.875-.87 1.055-.16.18-.32.2-.59.07-2.3-1.12-3.66-2.58-4.22-3.55-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.61-1.475-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.47.07-.72.34-.25.27-.96.94-.96 2.29s.98 2.64 1.12 2.82c.14.18 1.93 2.94 4.67 4.12.65.28 1.16.45 1.56.57.66.21 1.25.18 1.72.11.52-.08 1.59-.65 1.81-1.27.22-.63.22-1.16.16-1.27-.06-.11-.22-.18-.49-.31z" />
  </svg>
);
