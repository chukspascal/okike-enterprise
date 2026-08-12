import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, Lock, Sparkles, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { submitInquiry } from "@/lib/forms.functions";
import { askProjectAssistant } from "@/lib/ai-assistant.functions";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/ui/file-upload";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Build your project — OKIKE" },
      {
        name: "description",
        content:
          "Scope your project, see a fixed price, and lock it in with a deposit. Takes about 3 minutes.",
      },
      { property: "og:title", content: "Build your project — OKIKE" },
      {
        property: "og:description",
        content: "Interactive project builder — from scope to deposit.",
      },
    ],
  }),
  component: BookPage,
});

// ---------- Builder data ----------

type PackageId = "starter" | "business" | "custom";

const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;

const PACKAGES: {
  id: PackageId;
  name: string;
  base: number | null;
  timeline: string;
  desc: string;
  includes: string[];
}[] = [
    {
      id: "starter",
      name: "Starter Site",
      base: 150000,
      timeline: "1 week",
      desc: "A polished single-page site that converts visitors into leads.",
      includes: [
        "Custom design",
        "Mobile-responsive",
        "Contact form + analytics",
        "Hosting setup",
        "1 round of revisions",
      ],
    },
    {
      id: "business",
      name: "Business Site",
      base: 400000,
      timeline: "2–3 weeks",
      desc: "Multi-page marketing site with CMS so you can edit content yourself.",
      includes: [
        "Up to 8 pages",
        "Editable CMS",
        "Email + WhatsApp",
        "SEO foundation",
        "2 rounds of revisions",
        "30 days of support",
      ],
    },
    {
      id: "custom",
      name: "Custom Software",
      base: null,
      timeline: "From 4 weeks",
      desc: "Dashboards, internal tools, SaaS MVPs — scoped around your business.",
      includes: [
        "Discovery workshop",
        "Product design",
        "Database + auth",
        "Admin dashboard",
        "Ongoing partnership",
      ],
    },
  ];

type AddOn = { id: string; label: string; price: number; desc: string; for: PackageId[] };

const ADDONS: AddOn[] = [
  {
    id: "extra_pages",
    label: "Extra pages",
    price: 40000,
    desc: "+3 additional pages designed and built.",
    for: ["starter", "business"],
  },
  {
    id: "copywriting",
    label: "Copywriting",
    price: 80000,
    desc: "We write the words for you.",
    for: ["starter", "business"],
  },
  {
    id: "blog",
    label: "Blog / news section",
    price: 100000,
    desc: "CMS-powered blog with categories.",
    for: ["business"],
  },
  {
    id: "ecommerce",
    label: "Simple e-commerce",
    price: 180000,
    desc: "Up to 20 products, Stripe checkout.",
    for: ["business"],
  },
  {
    id: "booking",
    label: "Online booking",
    price: 120000,
    desc: "Calendar bookings + email confirmations.",
    for: ["business"],
  },
  {
    id: "i18n",
    label: "Multi-language",
    price: 90000,
    desc: "Two languages with switcher.",
    for: ["starter", "business"],
  },
  {
    id: "auth",
    label: "User accounts",
    price: 160000,
    desc: "Sign up, login, password reset.",
    for: ["business"],
  },
  {
    id: "seo_pro",
    label: "SEO accelerator",
    price: 70000,
    desc: "Schema, sitemap, page-speed pass.",
    for: ["starter", "business"],
  },
];

const TIMELINE_OPTIONS = [
  { id: "rush", label: "Rush (under 2 weeks)", multiplier: 1.25, note: "+25% rush fee" },
  { id: "standard", label: "Standard", multiplier: 1, note: "No rush fee" },
  { id: "flexible", label: "Flexible", multiplier: 0.95, note: "5% off — we slot you in" },
];

const SCOPE_QUESTIONS = {
  goal: [
    "Generate leads",
    "Sell products online",
    "Showcase work / portfolio",
    "Internal tool for my team",
    "Something else",
  ],
  pages: ["1 page", "2–5 pages", "6–10 pages", "10+ pages"],
  brand: ["I have a logo + colors", "Logo only", "Nothing yet — start from scratch"],
};

// ---------- Component ----------

function BookPage() {
  const navigate = useNavigate();
  const send = useServerFn(submitInquiry);
  const askProjectAI = useServerFn(askProjectAssistant);
  const { session, loading, user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState<PackageId | null>(null);
  const [scope, setScope] = useState({
    goal: "",
    pages: "",
    brand: "",
    description: "",
    fileUrl: null as string | null,
    fileName: null as string | null,
  });
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [timeline, setTimeline] = useState<string>("standard");

  // AI Assistant Mode state
  const [aiMode, setAiMode] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiClarificationCount, setAiClarificationCount] = useState(0);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [aiSuggested, setAiSuggested] = useState<Record<string, boolean>>({});

  const selectedPkg = PACKAGES.find((p) => p.id === pkg) ?? null;
  const isCustom = pkg === "custom";

  const availableAddons = useMemo(() => ADDONS.filter((a) => pkg && a.for.includes(pkg)), [pkg]);

  const subtotal = useMemo(() => {
    if (!selectedPkg?.base) return 0;
    const addonTotal = availableAddons.filter((a) => addons[a.id]).reduce((s, a) => s + a.price, 0);
    return selectedPkg.base + addonTotal;
  }, [selectedPkg, addons, availableAddons]);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/signup" });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-ink/60">Loading…</div>
        </div>
      </SiteLayout>
    );
  }

  if (!session) {
    return null;
  }

  const tl = TIMELINE_OPTIONS.find((t) => t.id === timeline)!;
  const total = Math.round(subtotal * tl.multiplier);
  const deposit = Math.round(total * 0.3);

  // Steps: 0 package, 1 scope, 2 add-ons, 3 timeline, 4 review
  // Custom skips add-ons (step 2)
  const STEPS = isCustom
    ? [
      { key: "package", label: "Package" },
      { key: "scope", label: "Scope" },
      { key: "timeline", label: "Timeline" },
      { key: "review", label: "Review" },
    ]
    : [
      { key: "package", label: "Package" },
      { key: "scope", label: "Scope" },
      { key: "addons", label: "Add-ons" },
      { key: "timeline", label: "Timeline" },
      { key: "review", label: "Review" },
    ];

  const currentKey = STEPS[step]?.key;

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function canAdvance() {
    if (currentKey === "package") return !!pkg;
    if (currentKey === "scope")
      return !!scope.goal && (isCustom ? scope.description.length >= 10 : !!scope.pages);
    if (currentKey === "timeline") return !!timeline;
    return true;
  }

  // Placeholder — task 4.2 will implement this
  async function handleAISubmit() {
    if (aiDescription.trim().length < 20 || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await askProjectAI({
        data: {
          description: aiDescription,
          packages: PACKAGES.map((p) => ({ id: p.id, name: p.name, base: p.base, timeline: p.timeline })),
          addons: ADDONS.map((a) => ({ id: a.id, label: a.label, price: a.price })),
          timelineOptions: TIMELINE_OPTIONS.map((t) => t.id),
        },
      });

      if (!result.ok) {
        toast.error("AI couldn't parse your description. Please fill in the form manually.");
        return;
      }

      const rec = result.recommendation;

      if (rec.needs_clarification === true) {
        // Clarification needed
        const newCount = aiClarificationCount + 1;
        if (newCount >= 2) {
          // Max rounds reached — fall back to manual
          setAiMode(false);
          setAiDescription("");
          setAiClarificationCount(0);
          setClarificationQuestion(null);
          setAiSuggested({});
          toast.error("Couldn't gather enough detail. Please fill in the form manually.");
        } else {
          setAiClarificationCount(newCount);
          setClarificationQuestion(rec.clarification_question);
        }
        return;
      }

      // Full recommendation — pre-populate builder state
      const newSuggested: Record<string, boolean> = {};

      if (rec.pkg) {
        setPkg(rec.pkg as PackageId);
        newSuggested["pkg"] = true;
      }
      if (rec.scopeGoal) {
        setScope((s) => ({ ...s, goal: rec.scopeGoal }));
        newSuggested["scope.goal"] = true;
      }
      if (rec.scopePages) {
        setScope((s) => ({ ...s, pages: rec.scopePages }));
        newSuggested["scope.pages"] = true;
      }
      if (rec.scopeBrand) {
        setScope((s) => ({ ...s, brand: rec.scopeBrand }));
        newSuggested["scope.brand"] = true;
      }
      // Pre-fill description with the original plain-English input
      setScope((s) => ({ ...s, description: aiDescription }));

      if (rec.addons && rec.addons.length > 0) {
        const newAddons: Record<string, boolean> = {};
        for (const id of rec.addons) {
          newAddons[id] = true;
          newSuggested[`addon.${id}`] = true;
        }
        setAddons(newAddons);
      }
      if (rec.timeline) {
        setTimeline(rec.timeline);
        newSuggested["timeline"] = true;
      }

      setAiSuggested(newSuggested);
      // Close AI panel and jump to step 0 so user sees pre-filled package
      setAiMode(false);
      setClarificationQuestion(null);
      setAiClarificationCount(0);
    } catch {
      toast.error("AI couldn't parse your description. Please fill in the form manually.");
    } finally {
      setAiLoading(false);
    }
  }

  async function submit(intent: "deposit" | "save") {
    if (!selectedPkg || !user?.id || !user?.email) {
      toast.error("Please make sure you're logged in.");
      return;
    }

    const fullName = user.user_metadata?.full_name || user.email.split("@")[0];
    setBusy(true);
    const summary = {
      package: selectedPkg.name,
      scope,
      addons: availableAddons
        .filter((a) => addons[a.id])
        .map((a) => `${a.label} (${formatNaira(a.price)})`),
      timeline: tl.label,
      pricing: isCustom
        ? "Custom — quote on request"
        : { subtotal, total, deposit, currency: "NGN" },
      intent,
    };
    const detailsBlock = `${scope.description || "(no extra description)"}${scope.fileUrl ? `\n\n📎 Attached Reference/Brief: ${scope.fileUrl}` : ""}\n\n— Builder summary —\n${JSON.stringify(summary, null, 2)}`;

    try {
      console.log("Submitting project...");
      const res = await send({
        data: {
          name: fullName,
          email: user.email,
          phone: "",
          company: "",
          project_type: selectedPkg.name,
          budget: isCustom
            ? "Custom quote"
            : `${formatNaira(total)} (deposit ${formatNaira(deposit)})`,
          timeline: tl.label,
          details: detailsBlock,
          client_user_id: user.id,
          package_name: selectedPkg.name,
          total: isCustom ? null : total,
          deposit: isCustom ? null : deposit,
          currency: "NGN",
          file_url: scope.fileUrl || "",
        },
      });
      console.log("Submit response:", res);
      if (res.ok) {
        toast.success("Project submitted successfully!");
        navigate({ to: "/dashboard" });
      } else {
        toast.error(res.error);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Please double-check the form and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 md:pt-28">
          <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-ink/50 mb-8">
            <span className="h-px w-8 bg-brand" />
            <span>Project Builder</span>
          </div>
          <h1 className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.92] tracking-wide uppercase text-ink max-w-3xl mb-4">
            Scope it. Price it.{" "}
            <span className="text-brand">Lock it in.</span>
          </h1>
          <p className="text-ink/60 max-w-[48ch] text-base">
            Five quick steps. We'll send a written proposal within 24 hours of submission.
          </p>
        </div>
      </section>

      <section className="px-6 py-12 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* AI Assistant toggle button */}
          <div className="mb-6 flex items-center">
            <button
              type="button"
              onClick={() => {
                if (aiMode) {
                  setAiMode(false);
                  setAiDescription("");
                  setAiClarificationCount(0);
                  setClarificationQuestion(null);
                  setAiSuggested({});
                  // Reset builder fields (req 2.8)
                  setPkg(null);
                  setScope({ goal: "", pages: "", brand: "", description: "", fileUrl: null, fileName: null });
                  setAddons({});
                  setTimeline("standard");
                } else {
                  setAiMode(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ring-1 transition ${aiMode
                ? "bg-brand text-brand-foreground ring-brand hover:opacity-90"
                : "bg-card text-ink ring-ink/15 hover:ring-brand hover:text-brand"
                }`}
            >
              {aiMode ? (
                <>✕ Exit AI Mode</>
              ) : (
                <>✦ Use AI Assistant</>
              )}
            </button>
          </div>

          {/* AI Assistant panel */}
          {aiMode && (
            <div className="bg-card rounded-3xl p-6 md:p-10 ring-1 ring-ink/5 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-brand" />
                <h2 className="text-xl font-medium tracking-tight">
                  Describe what you want to build
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g. I need an e-commerce site for my clothing brand, with product listings, a cart, and Instagram integration..."
                  rows={4}
                  maxLength={2000}
                  className="bg-surface ring-1 ring-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-brand transition resize-none"
                />
                {clarificationQuestion !== null && (
                  <div className="rounded-xl bg-brand/5 ring-1 ring-brand/20 px-4 py-3">
                    <p className="text-sm text-ink/80">{clarificationQuestion}</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-ink/40">
                    {aiDescription.length}/2000
                  </span>
                  <button
                    type="button"
                    onClick={handleAISubmit}
                    disabled={aiDescription.trim().length < 20 || aiLoading}
                    className="flex items-center gap-2 bg-brand text-brand-foreground py-2.5 px-5 rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      "Get AI Recommendation →"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stepper */}
          <ol className="flex flex-wrap items-center gap-2 mb-8 text-xs">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`px-3 py-1.5 rounded-full font-medium transition ${i === step
                    ? "bg-contrast text-contrast-foreground"
                    : i < step
                      ? "bg-brand/10 text-brand hover:bg-brand/20"
                      : "bg-card text-ink/40"
                    }`}
                >
                  {i + 1}. {s.label}
                </button>
                {i < STEPS.length - 1 && <span className="text-ink/20">›</span>}
              </li>
            ))}
          </ol>

          <div className="bg-card rounded-3xl p-6 md:p-10 ring-1 ring-ink/5">
            {/* Step 1: Package */}
            {currentKey === "package" && (
              <div className="flex flex-col gap-6">
                <StepHeader
                  title="What are we building?"
                  subtitle="Pick the package closest to what you need. You can refine the scope next."
                />
                <div className="grid md:grid-cols-3 gap-4">
                  {PACKAGES.map((p) => {
                    const active = pkg === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPkg(p.id)}
                        className={`text-left p-5 rounded-2xl ring-1 transition flex flex-col gap-3 ${active
                          ? "ring-brand bg-brand/5"
                          : "ring-ink/10 hover:ring-ink/30 bg-surface"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium">{p.name}</div>
                          {active && <Check className="size-4 text-brand" />}
                        </div>
                        <div className="text-2xl font-medium">
                          {p.base ? formatNaira(p.base) : "Custom"}
                        </div>
                        <div className="text-xs uppercase tracking-wider text-ink/40">
                          {p.timeline}
                        </div>
                        <p className="text-sm text-ink/60">{p.desc}</p>
                        <ul className="text-xs text-ink/60 space-y-1.5 mt-1">
                          {p.includes.slice(0, 3).map((f) => (
                            <li key={f} className="flex gap-1.5">
                              <Check className="size-3 text-brand mt-0.5 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Scope */}
            {currentKey === "scope" && (
              <div className="flex flex-col gap-6">
                <StepHeader
                  title="Tell us about the project"
                  subtitle={
                    isCustom
                      ? "The more detail, the better the quote."
                      : "A couple of quick choices so we tailor the build."
                  }
                />
                <RadioGroup
                  label="Primary goal"
                  value={scope.goal}
                  onChange={(v) => setScope({ ...scope, goal: v })}
                  options={SCOPE_QUESTIONS.goal}
                />
                {!isCustom && (
                  <RadioGroup
                    label="How many pages?"
                    value={scope.pages}
                    onChange={(v) => setScope({ ...scope, pages: v })}
                    options={SCOPE_QUESTIONS.pages}
                  />
                )}
                <RadioGroup
                  label="Brand assets"
                  value={scope.brand}
                  onChange={(v) => setScope({ ...scope, brand: v })}
                  options={SCOPE_QUESTIONS.brand}
                />
                <div className="flex flex-col gap-2">
                  <label htmlFor="project-description" className="text-sm font-medium">
                    Anything else we should know?{" "}
                    {isCustom && <span className="text-brand">*</span>}
                  </label>
                  <textarea
                    id="project-description"
                    aria-label="Project description"
                    value={scope.description}
                    onChange={(e) => setScope({ ...scope, description: e.target.value })}
                    rows={5}
                    placeholder="Reference sites, existing tools, target audience, must-have features…"
                    className="bg-surface ring-1 ring-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-brand transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Have a project brief, wireframe, or reference file?</span>
                  <FileUpload
                    value={scope.fileUrl}
                    fileName={scope.fileName}
                    onChange={(url, name) => setScope({ ...scope, fileUrl: url, fileName: name ?? null })}
                    bucket="media"
                    folder="inquiries"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Add-ons (skipped for custom) */}
            {currentKey === "addons" && (
              <div className="flex flex-col gap-6">
                <StepHeader
                  title="Add-ons"
                  subtitle="Optional extras. Toggle what you need — the price updates live."
                />
                <div className="grid md:grid-cols-2 gap-3">
                  {availableAddons.map((a) => {
                    const on = !!addons[a.id];
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAddons({ ...addons, [a.id]: !on })}
                        className={`text-left p-4 rounded-2xl ring-1 transition flex items-start gap-3 ${on ? "ring-brand bg-brand/5" : "ring-ink/10 hover:ring-ink/30 bg-surface"
                          }`}
                      >
                        <div
                          className={`size-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${on ? "bg-brand text-brand-foreground" : "ring-1 ring-ink/20"}`}
                        >
                          {on && <Check className="size-3" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="font-medium text-sm">{a.label}</div>
                            <div className="text-sm text-ink/70">+{formatNaira(a.price)}</div>
                          </div>
                          <p className="text-xs text-ink/50 mt-1">{a.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <PriceBar subtotal={subtotal} total={total} multiplier={tl.multiplier} />
              </div>
            )}

            {/* Step 4: Timeline */}
            {currentKey === "timeline" && (
              <div className="flex flex-col gap-6">
                <StepHeader
                  title="When do you need it?"
                  subtitle="Rush jobs cost more. Flexible saves a little."
                />
                <div className="grid md:grid-cols-3 gap-3">
                  {TIMELINE_OPTIONS.map((t) => {
                    const active = timeline === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTimeline(t.id)}
                        className={`p-5 rounded-2xl ring-1 transition text-left flex flex-col gap-2 ${active
                          ? "ring-brand bg-brand/5"
                          : "ring-ink/10 hover:ring-ink/30 bg-surface"
                          }`}
                      >
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-ink/50">{t.note}</div>
                      </button>
                    );
                  })}
                </div>
                {!isCustom && (
                  <PriceBar subtotal={subtotal} total={total} multiplier={tl.multiplier} />
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {currentKey === "review" && selectedPkg && (
              <div className="flex flex-col gap-6">
                <StepHeader
                  title="Review and submit"
                  subtitle="Submit your project and we'll review it shortly."
                />

                <div className="rounded-2xl bg-surface ring-1 ring-ink/10 p-6 flex flex-col gap-4">
                  <SummaryRow label="Package" value={selectedPkg.name} />
                  <SummaryRow label="Goal" value={scope.goal || "—"} />
                  {!isCustom && <SummaryRow label="Pages" value={scope.pages || "—"} />}
                  <SummaryRow label="Brand" value={scope.brand || "—"} />
                  {!isCustom && (
                    <SummaryRow
                      label="Add-ons"
                      value={
                        availableAddons
                          .filter((a) => addons[a.id])
                          .map((a) => a.label)
                          .join(", ") || "None"
                      }
                    />
                  )}
                  <SummaryRow label="Timeline" value={tl.label} />
                  {!isCustom && <SummaryRow label="Estimated total" value={formatNaira(total)} />}
                </div>

                <div className="rounded-2xl bg-contrast text-contrast-foreground p-6 flex flex-col gap-2">
                  <div className="text-sm opacity-70">Next steps</div>
                  <div className="text-sm font-medium">1. You submit your project request</div>
                  <div className="text-sm font-medium">
                    2. We review and send you an approval decision
                  </div>
                  <div className="text-sm font-medium">
                    3. Once approved, you'll be able to pay and get started
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => submit(isCustom ? "save" : "deposit")}
                  disabled={busy || !user?.id}
                  className="w-full bg-contrast text-contrast-foreground py-3 px-6 rounded-full font-medium hover:bg-contrast/90 transition disabled:opacity-50"
                >
                  {busy ? "Submitting…" : "Submit Project"}
                </button>
              </div>
            )}

            {/* Nav */}
            {currentKey !== "review" && (
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-ink/5">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 0}
                  className="flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ArrowLeft className="size-4" /> Back
                </button>
                {!isCustom && currentKey !== "package" && currentKey !== "scope" && (
                  <div className="hidden md:block text-sm text-ink/60">
                    Running total:{" "}
                    <span className="font-medium text-ink">{formatNaira(total)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={!canAdvance()}
                  className="flex items-center gap-2 bg-brand text-brand-foreground py-2.5 px-5 rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

// ---------- UI bits ----------

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl md:text-3xl font-medium tracking-tight">{title}</h2>
      <p className="text-sm text-ink/60">{subtitle}</p>
    </div>
  );
}

function RadioGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`px-4 py-2 rounded-full text-sm ring-1 transition ${active
                ? "bg-contrast text-contrast-foreground ring-contrast"
                : "bg-surface ring-ink/15 hover:ring-ink/40 text-ink/80"
                }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface ring-1 ring-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-brand transition"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink/50">{label}</span>
      <span className="text-ink text-right font-medium max-w-[60%]">{value}</span>
    </div>
  );
}

function PriceBar({
  subtotal,
  total,
  multiplier,
}: {
  subtotal: number;
  total: number;
  multiplier: number;
}) {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-ink/10 p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider text-ink/40">Subtotal</span>
        <span className="text-lg font-medium">{formatNaira(subtotal)}</span>
      </div>
      {multiplier !== 1 && (
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-ink/40">Timeline</span>
          <span className="text-lg font-medium">×{multiplier}</span>
        </div>
      )}
      <div className="flex flex-col items-end">
        <span className="text-xs uppercase tracking-wider text-brand">Project total</span>
        <span className="text-2xl font-medium">{formatNaira(total)}</span>
      </div>
    </div>
  );
}
