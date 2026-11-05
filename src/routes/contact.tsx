import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { submitContact } from "@/lib/forms.functions";
import { ArrowUpRight, Mail, MapPin, MessageSquare, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact OKIKE Enterprises — Direct Inquiries" },
      {
        name: "description",
        content:
          "Connect with OKIKE Enterprises. Inquiries for OKIKE Ventures, OKIKE Studio client projects, or OKIKE Academy cohorts.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Contact OKIKE Enterprises" },
      {
        property: "og:description",
        content: "Reach our leadership, studio, or academy coordinators.",
      },
    ],
    links: [{ rel: "canonical", href: "https://okike-enterprise.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const navigate = useNavigate();
  const send = useServerFn(submitContact);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<"general" | "studio" | "academy">("general");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await send({
        data: {
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          message: `[Category: ${category.toUpperCase()}] ${String(fd.get("message") || "")}`,
        },
      });
      if (res.ok) {
        navigate({ to: "/thank-you" });
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Please check your message and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      {/* ─── HERO (FLAT STUDIO BLACK + #E3EE32 — NO GRADIENTS/BLURS) ─── */}
      <section className="relative overflow-hidden bg-[#0E0E0E] border-b border-white/10 py-20 md:py-24 px-6">
        <div className="relative max-w-6xl mx-auto">
          <div className="mb-6">
            <span className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-white/60">
              <span className="w-8 h-px bg-[#E3EE32]" />
              Direct Dispatch
            </span>
          </div>

          <h1 className="font-display text-[clamp(3rem,7.5vw,6rem)] leading-[0.94] tracking-wide uppercase text-white max-w-3xl">
            Start a conversation with <span className="text-[#E3EE32]">OKIKE.</span>
          </h1>

          <p className="mt-5 text-base md:text-lg text-white/75 max-w-xl leading-relaxed">
            Whether you want to partner with OKIKE Studio on custom software, inquire about startup
            incubation, or apply to OKIKE Academy, our coordinators respond within 24 hours.
          </p>

          {/* 3-Channel Routing Cards */}
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <a
              href="https://studio.okikeenterprises.com/enquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#151514] rounded-2xl border border-white/10 hover:border-[#E3EE32] p-6 flex flex-col justify-between gap-4 transition-colors group"
            >
              <div>
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E3EE32]">
                  01 // Client Projects
                </div>
                <div className="text-lg font-bold text-white mt-1">Scope via OKIKE Studio</div>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Configure timeline, package specifications, and pricing on our live Studio portal.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#E3EE32] group-hover:text-white">
                Studio Enquiry <ArrowUpRight className="size-3.5" />
              </span>
            </a>

            <Link
              to="/enroll"
              className="bg-[#151514] rounded-2xl border border-white/10 hover:border-[#E3EE32] p-6 flex flex-col justify-between gap-4 transition-colors group"
            >
              <div>
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E3EE32]">
                  02 // Students &amp; Cohorts
                </div>
                <div className="text-lg font-bold text-white mt-1">Apply to OKIKE Academy</div>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Register for upcoming terms in Web, UI/UX, Python, and the Synergy Summit.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#E3EE32] group-hover:text-white">
                Academy Application <ArrowUpRight className="size-3.5" />
              </span>
            </Link>

            <a
              href="mailto:okikeenterprises@gmail.com"
              className="bg-[#E3EE32] text-[#0E0E0E] rounded-2xl p-6 flex flex-col justify-between gap-4 transition-colors group"
            >
              <div>
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0E0E0E]/85">
                  03 // Direct Email
                </div>
                <div className="text-lg font-bold text-[#0E0E0E] mt-1 break-all">
                  okikeenterprises@gmail.com
                </div>
                <p className="text-xs text-[#0E0E0E]/85 mt-1 leading-relaxed">
                  Institutional partnerships, venture relations, and general inquiries.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E0E0E]">
                Write Email <ArrowUpRight className="size-3.5" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── FORM & CHANNELS ─── */}
      <section className="py-24 px-6 bg-[#0E0E0E] text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 flex flex-col gap-5">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
              Send a Message
            </span>
            <h2 className="font-display text-4xl uppercase tracking-wide text-white">
              Direct Inquiries.
            </h2>
            <p className="text-sm text-white/75 leading-relaxed">
              Use the form to send a message directly to the coordination team. Select the branch
              you are inquiring about so it lands on the appropriate desk.
            </p>

            <div className="space-y-3.5 pt-4 border-t border-white/10 text-xs text-white/75">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-[#E3EE32] shrink-0" />
                <span>okikeenterprises@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-[#E3EE32] shrink-0" />
                <span>Nigeria — Operating globally</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="size-4 text-[#E3EE32] shrink-0" />
                <span>Response time: Within 24 hours</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#151514] rounded-2xl border border-white/10 p-7 sm:p-10">
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-white">Inquiry Category</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "general", label: "General" },
                    { id: "studio", label: "Studio / Build" },
                    { id: "academy", label: "Academy" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                        category === cat.id
                          ? "bg-[#E3EE32] text-[#0E0E0E] border-[#E3EE32]"
                          : "bg-[#1a1a18] text-white/75 border-white/15 hover:border-[#E3EE32]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Full Name" name="name" required placeholder="Your full name" />
              <Field
                label="Email Address"
                name="email"
                type="email"
                required
                placeholder="name@domain.com"
              />
              <TextArea
                label="Message"
                name="message"
                required
                minLength={5}
                rows={5}
                placeholder="Tell us about your venture, business requirements, or academic goals..."
              />

              <button
                type="submit"
                disabled={busy}
                className="bg-[#E3EE32] hover:bg-[#d4df28] text-[#0E0E0E] py-3.5 px-7 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 self-start inline-flex items-center gap-2"
              >
                <span>{busy ? "Sending…" : "Send Message"}</span>
                <Send className="size-3.5" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-white">
        {label}
        {required && <span className="text-[#E3EE32]"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="bg-[#0E0E0E] rounded-lg border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#E3EE32] transition-colors"
        {...rest}
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  required,
  placeholder,
  ...rest
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-white">
        {label}
        {required && <span className="text-[#E3EE32]"> *</span>}
      </span>
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        className="bg-[#0E0E0E] rounded-lg border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#E3EE32] transition-colors resize-y"
        {...rest}
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  required,
  ...rest
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-white">
        {label}
        {required && <span className="text-[#E3EE32]"> *</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="bg-[#0E0E0E] rounded-lg border border-white/15 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E3EE32] transition-colors"
        {...rest}
      >
        <option value="" disabled>
          Choose…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
