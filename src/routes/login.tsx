import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — OKIKE" },
      { name: "description", content: "Sign in to your OKIKE account to track your project progress in real time." },
      { property: "og:title", content: "Sign in — OKIKE" },
      { property: "og:description", content: "Access your OKIKE dashboard." },
    ],
    links: [{ rel: "canonical", href: "https://okike-enterprise.com/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/dashboard" });
  }, [session, role, navigate]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
      setForgotMode(false);
    }
  }

  async function onGithub() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message ?? "Could not sign in with GitHub");
  }

  async function onGoogle() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message ?? "Could not sign in with Google");
  }

  if (forgotMode) {
    return (
      <SiteLayout>
        <section className="py-24 px-6 min-h-[80vh] flex items-center">
          <div className="max-w-md w-full mx-auto flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-ink/50 mb-4">
                <span className="h-px w-8 bg-brand" />
                <span>Reset password</span>
              </div>
              <h1 className="font-display text-5xl leading-[0.92] tracking-wide uppercase text-ink">
                Forgot <span className="text-brand">Password</span>
              </h1>
              <p className="text-sm text-ink/65 mt-3 leading-relaxed">
                Enter your email address below, and we'll send you a secure link to reset your password.
              </p>
            </div>

            <form onSubmit={onForgotPassword} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="Email Address"
                aria-label="Email Address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition w-full"
              />
              <button
                disabled={forgotBusy}
                className="w-full py-3.5 bg-brand text-brand-foreground font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
              >
                {forgotBusy ? "Sending…" : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full py-2.5 text-ink/60 font-semibold text-xs uppercase tracking-widest hover:text-ink transition mt-1"
              >
                Back to Sign in
              </button>
            </form>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="py-24 px-6 min-h-[80vh] flex items-center">
        <div className="max-w-md w-full mx-auto flex flex-col gap-8">

          <div>
            <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-ink/50 mb-4">
              <span className="h-px w-8 bg-brand" />
              <span>Welcome back</span>
            </div>
            <h1 className="font-display text-5xl leading-[0.92] tracking-wide uppercase text-ink">
              Sign in to <span className="text-brand">OKIKE</span>
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onGithub}
                disabled={busy}
                className="w-full py-3.5 bg-contrast text-contrast-foreground font-semibold text-sm uppercase tracking-widest hover:bg-brand hover:text-brand-foreground transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Github className="size-4" />
                GitHub
              </button>
              <button
                onClick={onGoogle}
                disabled={busy}
                className="w-full py-3.5 bg-contrast text-contrast-foreground font-semibold text-sm uppercase tracking-widest hover:bg-brand hover:text-brand-foreground transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-ink/40">
              <div className="flex-1 h-px bg-ink/10" />
              <span className="uppercase tracking-widest text-[10px]">or</span>
              <div className="flex-1 h-px bg-ink/10" />
            </div>

            <form onSubmit={onEmail} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-surface ring-1 ring-ink/10 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs text-brand font-semibold hover:underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>
              <button
                disabled={busy}
                className="w-full py-3.5 bg-brand text-brand-foreground font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
              >
                {busy ? "…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-sm text-ink/60">
            New to OKIKE?{" "}
            <Link to="/signup" className="text-brand font-semibold hover:underline underline-offset-2">
              Create an account
            </Link>
          </p>

        </div>
      </section>
    </SiteLayout>
  );
}
