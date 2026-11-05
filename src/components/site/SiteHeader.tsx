import { Link, useNavigate } from "@tanstack/react-router";
import okikeLogo from "@/assets/okike-logo.png";
import { useState } from "react";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
};

const navItems: NavLink[] = [
  { to: "/", label: "Home" },
  { href: "https://studio.okikeenterprises.com", label: "Studio", external: true },
  { to: "/learn", label: "Academy" },
  { to: "/about", label: "About" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session, user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0]?.toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#0e0e0e] border-b border-[#2a2a28]">
      <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between gap-8">
        {/* Brand: Pure white wordmark per guidelines */}
        <Link to="/" className="flex items-center shrink-0" aria-label="OKIKE">
          <img
            src={okikeLogo}
            alt="OKIKE"
            className="h-7 w-auto object-contain brightness-0 invert"
          />
        </Link>

        {/* Desktop Nav: Clean studio architectural typography */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.16em] font-medium text-white/60 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>{item.label}</span>
                <ArrowUpRight className="size-3 text-[#e3ee32]" />
              </a>
            ) : (
              <Link
                key={item.to}
                to={item.to!}
                activeOptions={{ exact: item.to === "/" }}
                className="text-xs uppercase tracking-[0.16em] font-medium text-white/60 hover:text-white transition-colors"
                activeProps={{
                  className: "text-xs uppercase tracking-[0.16em] font-semibold text-[#e3ee32]",
                }}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Right utility & primary action (Studio Action Button) */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="size-8 rounded-full bg-[#e3ee32] text-[#0e0e0e] text-xs font-mono font-bold flex items-center justify-center hover:bg-white transition">
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-[#171716] text-white border border-[#2a2a28] p-1"
              >
                <div className="px-2 py-1.5 text-[11px] text-white/50 truncate font-mono">
                  {user?.email}
                </div>
                <DropdownMenuSeparator className="bg-[#2a2a28]" />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="text-xs cursor-pointer hover:bg-white/10"
                >
                  <LayoutDashboard className="size-3.5 mr-2 text-[#e3ee32]" /> Dashboard
                </DropdownMenuItem>
                {role === "admin" && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/admin" })}
                    className="text-xs cursor-pointer hover:bg-white/10"
                  >
                    <Shield className="size-3.5 mr-2 text-[#c4b0f0]" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#2a2a28]" />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                  className="text-xs cursor-pointer hover:bg-white/10 text-red-400"
                >
                  <LogOut className="size-3.5 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className="text-xs uppercase tracking-[0.16em] font-medium text-white/60 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          )}

          <a
            href="https://studio.okikeenterprises.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-[0.14em] font-bold px-4 py-2.5 rounded bg-[#e3ee32] text-[#0e0e0e] hover:bg-white transition-colors"
          >
            Launch Studio
          </a>
        </div>

        {/* Mobile menu trigger */}
        <button
          className="md:hidden text-white/80 hover:text-white p-2 -mr-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden border-t border-[#2a2a28] bg-[#0e0e0e] px-6 py-5">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="text-xs uppercase tracking-[0.16em] font-medium text-white/70 hover:text-white flex items-center justify-between py-1"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="size-3 text-[#e3ee32]" />
                </a>
              ) : (
                <Link
                  key={item.to}
                  to={item.to!}
                  activeOptions={{ exact: item.to === "/" }}
                  onClick={() => setOpen(false)}
                  className="text-xs uppercase tracking-[0.16em] font-medium text-white/70 hover:text-white py-1"
                  activeProps={{ className: "text-[#e3ee32] font-semibold" }}
                >
                  {item.label}
                </Link>
              ),
            )}

            <div className="h-px bg-white/10 my-2" />

            {session ? (
              <div className="flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="text-xs uppercase tracking-wider text-white/80 py-1"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    setOpen(false);
                    navigate({ to: "/" });
                  }}
                  className="text-xs uppercase tracking-wider text-left text-red-400 py-1"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="text-xs uppercase tracking-[0.16em] font-medium text-white/70 py-1"
                >
                  Sign in
                </Link>
                <a
                  href="https://studio.okikeenterprises.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs uppercase tracking-[0.14em] font-bold text-center py-2.5 rounded bg-[#e3ee32] text-[#0e0e0e]"
                >
                  Launch Studio
                </a>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
