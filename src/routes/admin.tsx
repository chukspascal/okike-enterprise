import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import okikeLogo from "@/assets/okike-logo.png";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import {
  LayoutGrid,
  Users,
  FolderKanban,
  BarChart3,
  CreditCard,
  FileText,
  Megaphone,
  HeartPulse,
  Settings,
  Menu,
  Inbox,
  Image as ImageIcon,
  Package,
  X,
  LogOut,
  BookOpen,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — OKIKE" }] }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/instructor", label: "Instructor View", icon: GraduationCap },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/bootcamp", label: "Summit Registrations", icon: GraduationCap },
  { to: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/content/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/content/tracks", label: "Learning Paths", icon: BookOpen },
  { to: "/admin/content/physical-classes", label: "Physical Classes", icon: BookOpen },
  { to: "/admin/content/services", label: "Services", icon: Package },
  { to: "/admin/content/packages", label: "Packages", icon: Package },
  { to: "/admin/content/portfolio", label: "Portfolio", icon: ImageIcon },
  { to: "/admin/content/partners", label: "Partners", icon: Users },
  { to: "/admin/content/blog", label: "Blog", icon: FileText },
  { to: "/admin/about-editor", label: "About Page CMS", icon: FileText },
  { to: "/admin/content/events", label: "Events", icon: Megaphone },
  { to: "/admin/announcements", label: "Messages", icon: Megaphone },
  { to: "/admin/reports", label: "Reports", icon: FileText },
  { to: "/admin/system-health", label: "System Health", icon: HeartPulse },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ShieldAlert },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { session, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (role && role !== "admin") navigate({ to: "/dashboard" });
  }, [session, role, loading, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading || !session || role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const email = session.user?.email ?? "Admin";
  const initial = (email[0] ?? "A").toUpperCase();

  const SidebarNav = (
    <>
      <div className="px-1">
        <Link to="/" className="block" aria-label="OKIKE home">
          <img src={okikeLogo} alt="OKIKE" className="h-8 w-auto" />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
          Admin Console
        </div>
      </div>

      <nav className="mt-7 flex-1 flex flex-col gap-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {NAV.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active
                  ? "bg-brand/15 text-brand ring-1 ring-brand/30"
                  : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                }`}
            >
              <Icon className="size-4" />
              <span className="flex-1">{t.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-3 px-1 py-2 rounded-xl">
        <div className="size-9 rounded-full bg-brand/20 ring-2 ring-brand/30 grid place-items-center text-sm font-semibold text-brand">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{email}</div>
          <div className="text-[11px] text-muted-foreground">Admin</div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="text-muted-foreground hover:text-brand p-1 rounded"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-full">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex h-full w-64 shrink-0 flex-col border-r border-border bg-card px-5 py-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {SidebarNav}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border px-5 py-5 flex flex-col overflow-y-auto">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-foreground/5"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
              {SidebarNav}
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-4 bg-background/85 backdrop-blur border-b border-border">
            <button
              className="lg:hidden text-foreground/70 p-2 hover:bg-foreground/5 rounded-lg"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium text-foreground/80 truncate">
                {NAV.find((n) =>
                  n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to),
                )?.label ?? "Admin"}
              </h2>
            </div>
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-foreground/5 ring-1 ring-border px-3 py-2 text-xs font-medium hover:bg-foreground/10"
            >
              Client view
            </Link>
            <ThemeToggle />
          </header>

          <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
