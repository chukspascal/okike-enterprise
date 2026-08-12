import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Calendar, MapPin, Users, CheckCircle, Briefcase, TrendingUp, Coins, Terminal, Database, Palette, Smartphone, Shield, Layers, Award, ArrowRight, Globe } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { submitBootcampRegistration, verifyBootcampPayment } from "@/lib/forms.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getBootcampCoursePrice } from "@/lib/utils";

export const Route = createFileRoute("/bootcamp")({
    head: () => ({
        meta: [
            { title: "Computing Synergy Summit — Register Now" },
            { name: "description", content: "Register for the Computing Synergy Summit starting 1st August 2026. Free for CS/IT department students, ₦5,000 for others." },
            { property: "og:title", content: "Computing Synergy Summit — Register Now" },
            { property: "og:description", content: "Register for the Computing Synergy Summit. Free for CS/IT department students, ₦5,000 for others." },
        ],
    }),
    component: BootcampPage,
});

const DEPARTMENTS = [
    "Computer Science",
    "Information Technology",
    "Software Engineering",
    "Cyber Security",
    "Computer Engineering",
    "Electrical/Electronics Engineering",
    "Mathematics",
    "Statistics",
    "Physics",
    "Other",
];

const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Not a Student"];

const COURSES = [
    "Frontend Web Development",
    "Backend Web Development",
    "Product Design (UI/UX)",
    "Mobile App Development",
    "Cyber Security",
    "Data Analysis with Python",
    "AI & Machine Learning"
];

function BootcampPage() {
    const navigate = useNavigate();
    const { session, user, loading } = useAuth();
    const register = useServerFn(submitBootcampRegistration);
    const verifyPayment = useServerFn(verifyBootcampPayment);
    const [busy, setBusy] = useState(false);
    const [regType, setRegType] = useState<"student" | "non-student">("student");
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("");
    const isDeptStudent = regType === "student" &&
        ["Computer Science", "Information Technology", "Software Engineering", "Cyber Security"].includes(selectedDept) &&
        selectedLevel !== "Not a Student";

    const [userRegs, setUserRegs] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loadingRegCheck, setLoadingRegCheck] = useState(true);

    const [cachedReg, setCachedReg] = useState<{
        name: string;
        email: string;
        phone: string;
        department: string;
        level: string;
        course: string;
        reg_no: string | null;
        reference: string | null;
        status: "pending" | "paid" | "free";
        isDeptStudent: boolean;
    } | null>(null);
    const [password, setPassword] = useState("");
    const [finishingProfile, setFinishingProfile] = useState(false);

    const [departments, setDepartments] = useState<string[]>(DEPARTMENTS);
    const [courses, setCourses] = useState<string[]>(COURSES);
    const [dbLoading, setDbLoading] = useState(false);

    const [selectedCourse, setSelectedCourse] = useState("");

    const currentPrice = 5000;

    useEffect(() => {
        if (courses.length > 0 && !selectedCourse) {
            setSelectedCourse(courses[0]);
        }
    }, [courses, selectedCourse]);

    const registeredTracks = userRegs.map((r) => r.course).filter(Boolean);
    const availableCourses = courses.filter((c) => !registeredTracks.includes(c));

    useEffect(() => {
        async function checkExistingReg() {
            if (loading) return;
            if (!session?.user?.email) {
                setLoadingRegCheck(false);
                return;
            }
            try {
                const { data } = await (supabase as any)
                    .from("bootcamp_registrations")
                    .select("*")
                    .ilike("email", session.user.email)
                    .order("created_at", { ascending: false });
                if (data && data.length > 0) {
                    setUserRegs(data);
                    setSelectedDept(data[0].department || "");
                    setSelectedLevel(data[0].level || "");
                } else {
                    setUserRegs([]);
                }
            } catch (err) {
                console.error("Error checking registration", err);
            } finally {
                setLoadingRegCheck(false);
            }
        }
        checkExistingReg();
    }, [session, loading]);

    useEffect(() => {
        async function loadData() {
            try {
                const [{ data: depts }, { data: crs }] = await Promise.all([
                    (supabase as any).from("aksu_departments").select("name").order("name"),
                    (supabase as any).from("bootcamp_courses").select("name").order("name"),
                ]);
                if (depts && depts.length > 0) {
                    setDepartments(depts.map((d: any) => d.name));
                }
                if (crs && crs.length > 0) {
                    setCourses(crs.map((c: any) => c.name));
                }
            } catch (err) {
                console.error("Failed to load departments/courses", err);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("okike_bootcamp_reg");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (user && (parsed.status === "paid" || parsed.status === "free")) {
                    localStorage.removeItem("okike_bootcamp_reg");
                    setCachedReg(null);
                } else {
                    setCachedReg(parsed);
                }
            } catch {
                localStorage.removeItem("okike_bootcamp_reg");
            }
        }
    }, [user]);

    function handleStartOver() {
        localStorage.removeItem("okike_bootcamp_reg");
        setCachedReg(null);
        toast.info("Registration cleared. You can start a new registration now.");
    }

    async function handleFinishProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!cachedReg || !password) return;
        setFinishingProfile(true);

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: cachedReg.email,
                password: password,
                options: {
                    data: {
                        full_name: cachedReg.name,
                    }
                }
            });

            if (signUpError) {
                if (signUpError.message.includes("already registered") || signUpError.message.includes("User already exists")) {
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: cachedReg.email,
                        password: password,
                    });
                    if (signInError) {
                        toast.error("User already exists. If that is your account, please enter the correct password, or log in via the Login page.");
                        setFinishingProfile(false);
                        return;
                    }
                } else {
                    toast.error(signUpError.message);
                    setFinishingProfile(false);
                    return;
                }
            }

            toast.success("Account created successfully! Welcome to your dashboard.");
            localStorage.removeItem("okike_bootcamp_reg");
            setCachedReg(null);
            navigate({ to: "/dashboard" });
        } catch (err) {
            toast.error("Failed to complete account setup. Please try again.");
        } finally {
            setFinishingProfile(false);
        }
    }

    function handleResumePayment() {
        if (!cachedReg || !cachedReg.reference) return;
        setBusy(true);

        const koraKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY;
        if (!koraKey) {
            toast.error("Payment setup is missing. Please contact support.");
            setBusy(false);
            return;
        }

        const korapay = (window as any).Korapay;
        if (!korapay) {
            toast.error("Payment gateway failed to load. Please refresh and try again.");
            setBusy(false);
            return;
        }

        korapay.initialize({
            key: koraKey,
            reference: cachedReg.reference,
            amount: getBootcampCoursePrice(cachedReg.course),
            currency: "NGN",
            customer: {
                name: cachedReg.name,
                email: cachedReg.email,
            },
            onSuccess: async (transaction: any) => {
                toast.loading("Verifying payment...");
                try {
                    const ver = await verifyPayment({ data: { reference: cachedReg.reference! } });
                    toast.dismiss();
                    if (ver.ok) {
                        if (user) {
                            toast.success("Payment confirmed and registration complete!");
                            localStorage.removeItem("okike_bootcamp_reg");
                            setCachedReg(null);
                            navigate({ to: "/dashboard" });
                            return;
                        }
                        toast.success("Payment confirmed! Now choose a password to complete your account.");
                        const updated = {
                            ...cachedReg,
                            status: "paid" as const
                        };
                        localStorage.setItem("okike_bootcamp_reg", JSON.stringify(updated));
                        setCachedReg(updated);
                    } else {
                        toast.error(ver.error || "Payment verification failed. Please try again.");
                    }
                } catch {
                    toast.dismiss();
                    toast.error("Could not verify payment automatically. We will check it shortly.");
                } finally {
                    setBusy(false);
                }
            },
            onFailed: () => {
                toast.error("Payment failed. You can try again.");
                setBusy(false);
            },
            onClose: () => {
                toast.warning("Payment closed.");
                setBusy(false);
            }
        });
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        const name = user ? (user.user_metadata?.full_name || "Student") : String(fd.get("name") || "");
        const email = user ? (user.email || "") : String(fd.get("email") || "").toLowerCase().trim();
        const phone = String(fd.get("phone") || "");
        const department = regType === "student" ? String(fd.get("department") || "") : "General Public";
        const level = regType === "student" ? String(fd.get("level") || "") : "Not a Student";
        const course = selectedCourse;
        const reg_no = (regType === "student" && isDeptStudent) ? String(fd.get("reg_no") || "").trim() : "";

        if (isDeptStudent) {
            if (!reg_no || !reg_no.toLowerCase().includes("csc")) {
                toast.error("Invalid registration number. Department students must provide a valid registration number.");
                setBusy(false);
                return;
            }
        }

        try {
            const res = await register({
                data: {
                    name,
                    email,
                    phone,
                    department,
                    level,
                    course,
                    is_department_student: isDeptStudent,
                    reg_no,
                },
            });

            if (!res.ok) {
                toast.error(res.error || "Registration failed. Please try again.");
                setBusy(false);
                return;
            }

            if (isDeptStudent) {
                if (user) {
                    toast.success("Registration confirmed successfully! Redirecting to your dashboard...");
                    localStorage.removeItem("okike_bootcamp_reg");
                    setCachedReg(null);
                    setBusy(false);
                    navigate({ to: "/dashboard" });
                    return;
                }
                toast.success("Registration confirmed successfully! Now choose a password to complete your profile.");
                const regData = {
                    name,
                    email,
                    phone,
                    department,
                    level,
                    course,
                    reg_no,
                    reference: null,
                    status: "free" as const,
                    isDeptStudent: true
                };
                localStorage.setItem("okike_bootcamp_reg", JSON.stringify(regData));
                setCachedReg(regData);
                setBusy(false);
                return;
            }

            // Trigger Korapay for non-department students
            const koraKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY;
            if (!koraKey) {
                toast.error("Payment setup is missing. Please contact support.");
                setBusy(false);
                return;
            }

            const korapay = (window as any).Korapay;
            if (!korapay) {
                toast.error("Payment gateway failed to load. Please refresh and try again.");
                setBusy(false);
                return;
            }

            korapay.initialize({
                key: koraKey,
                reference: res.reference,
                amount: getBootcampCoursePrice(course),
                currency: "NGN",
                customer: {
                    name,
                    email,
                },
                onSuccess: async (transaction: any) => {
                    toast.loading("Verifying payment...");
                    try {
                        const ver = await verifyPayment({ data: { reference: res.reference } });
                        toast.dismiss();
                        if (ver.ok) {
                            if (user) {
                                toast.success("Payment confirmed and registration complete!");
                                localStorage.removeItem("okike_bootcamp_reg");
                                setCachedReg(null);
                                navigate({ to: "/dashboard" });
                                return;
                            }
                            toast.success("Payment confirmed! Now choose a password to complete your profile.");
                            const regData = {
                                name,
                                email,
                                phone,
                                department,
                                level,
                                course,
                                reg_no: null,
                                reference: res.reference,
                                status: "paid" as const,
                                isDeptStudent: false
                            };
                            localStorage.setItem("okike_bootcamp_reg", JSON.stringify(regData));
                            setCachedReg(regData);
                        } else {
                            toast.error(ver.error || "Payment verification failed. Please try again.");
                        }
                    } catch {
                        toast.dismiss();
                        toast.error("Could not verify payment automatically. We will check it shortly.");
                    } finally {
                        setBusy(false);
                    }
                },
                onFailed: (transaction: any) => {
                    toast.error("Payment failed. Your registration is saved as pending.");
                    const regData = {
                        name,
                        email,
                        phone,
                        department,
                        level,
                        course,
                        reg_no: null,
                        reference: res.reference,
                        status: "pending" as const,
                        isDeptStudent: false
                    };
                    localStorage.setItem("okike_bootcamp_reg", JSON.stringify(regData));
                    setCachedReg(regData);
                    setBusy(false);
                },
                onClose: () => {
                    toast.warning("Payment modal closed. Your registration is pending.");
                    const regData = {
                        name,
                        email,
                        phone,
                        department,
                        level,
                        course,
                        reg_no: null,
                        reference: res.reference,
                        status: "pending" as const,
                        isDeptStudent: false
                    };
                    localStorage.setItem("okike_bootcamp_reg", JSON.stringify(regData));
                    setCachedReg(regData);
                    setBusy(false);
                },
            });
        } catch {
            toast.error("Something went wrong. Please try again.");
            setBusy(false);
        }
    }

    return (
        <SiteLayout>
            {/* ─── HERO ─── */}
            <section className="relative overflow-hidden border-b border-ink/10 bg-contrast text-contrast-foreground">
                <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20">
                    <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-brand mb-8">
                        <span className="h-px w-8 bg-brand" />
                        <span>Upcoming Event</span>
                    </div>
                    <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.92] tracking-wide uppercase text-contrast-foreground max-w-4xl mb-6">
                        Computing{" "}
                        <span className="text-brand">Synergy</span>{" "}
                        Summit
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-contrast-foreground/70 mb-8">
                        <span className="flex items-center gap-2">
                            <Calendar className="size-4 text-brand" />
                            1st August 2026
                        </span>
                        <span className="flex items-center gap-2">
                            <MapPin className="size-4 text-brand" />
                            Venue TBA
                        </span>
                        <span className="flex items-center gap-2">
                            <Users className="size-4 text-brand" />
                            Unlimited spots
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-brand/20 text-brand text-sm font-semibold rounded-full">
                            <CheckCircle className="size-4" />
                            Free for CS/IT department students
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-contrast-foreground/10 text-contrast-foreground/80 text-sm font-semibold rounded-full">
                            ₦5,000 for non-department attendees
                        </div>
                    </div>
                </div>
            </section>

            <CareerPathExplorer />

            {/* ─── FORM + DETAILS ─── */}
            <section className="px-6 py-16 md:py-24">
                <div className="max-w-7xl mx-auto grid md:grid-cols-[1fr_480px] gap-16 items-start">

                    {/* Left — About */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-ink/50 mb-4">
                                <span className="h-px w-8 bg-brand" />
                                <span>About the event</span>
                            </div>
                            <h2 className="font-display text-4xl md:text-5xl leading-[0.92] tracking-wide uppercase text-ink mb-4">
                                Where tech minds <span className="text-brand">converge.</span>
                            </h2>
                            <p className="text-ink/65 leading-relaxed max-w-[48ch]">
                                The Computing Synergy Summit is a four (4) month event bringing together students, developers, and tech enthusiasts to learn, network, and build together. Whether you're from the department or just passionate about tech — you're welcome here.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Talks & Workshops", desc: "Learn from industry professionals and senior students" },
                                { title: "Networking", desc: "Connect with like-minded tech enthusiasts" },
                                { title: "Live Demos", desc: "See real projects built with modern tech" },
                                { title: "Q&A Sessions", desc: "Get your questions answered directly" },
                            ].map((item) => (
                                <div key={item.title} className="p-4 bg-card ring-1 ring-ink/10 rounded-xl">
                                    <div className="font-semibold text-sm mb-1">{item.title}</div>
                                    <p className="text-xs text-ink/60">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 bg-brand/5 ring-1 ring-brand/20 rounded-xl">
                            <div className="text-sm font-semibold text-brand mb-2">Payment info (for non-department attendees)</div>
                            <p className="text-sm text-ink/70">Registration is free for all CS/IT department students. If you are not from the department, your registration payment of ₦5,000 secures your spot.</p>
                        </div>
                    </div>

                    {/* Right — Already Registered, Form or Cache states */}
                    {loadingRegCheck ? (
                        <div className="bg-card ring-1 ring-ink/10 rounded-2xl p-6 md:p-8 text-center text-ink/40 text-sm">
                            Checking registration status...
                        </div>
                    ) : userRegs.length > 0 && !showForm ? (
                        <div className="bg-card ring-1 ring-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-semibold text-xl text-ink">You're Registered!</h3>
                                <p className="text-xs text-ink/50">Computing Synergy Summit 2026</p>
                            </div>

                            <p className="text-sm text-ink/70 leading-relaxed">
                                Hi <strong className="text-ink">{userRegs[0].name}</strong>, you have secured your spot for the following track(s):
                            </p>

                            <div className="flex flex-col gap-3">
                                {userRegs.map((reg: any) => (
                                    <div key={reg.id} className="p-4 bg-surface ring-1 ring-ink/5 rounded-xl text-xs flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-ink text-sm truncate">{reg.course}</div>
                                            <div className="text-ink/50 mt-0.5">{reg.department} ({reg.level})</div>
                                        </div>
                                        <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                                            reg.payment_status === "paid"
                                                ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"
                                                : reg.payment_status === "free"
                                                    ? "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
                                                    : "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20"
                                        }`}>
                                            {reg.payment_status === "paid" ? "Confirmed (Paid)" : reg.payment_status === "free" ? "Confirmed (Free)" : "Pending"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <WhatsappIcon className="size-5 text-emerald-500 shrink-0" />
                                    <h4 className="font-semibold text-sm text-ink">Join the WhatsApp Community</h4>
                                </div>
                                <p className="text-xs text-ink/75 leading-relaxed">
                                    Get real-time announcements, virtual session links, tasks, and connect with other attendees. Joining the community is required for all bootcamp tracks.
                                </p>
                                <a
                                    href="https://chat.whatsapp.com/GLemXx2uWn5F6Nm40ihiD7"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition"
                                >
                                    Join Group Chat &rarr;
                                </a>
                            </div>

                            <div className="flex flex-col gap-2 mt-2">
                                <button
                                    onClick={() => navigate({ to: "/dashboard" })}
                                    className="w-full py-3.5 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition"
                                >
                                    Go to Dashboard &rarr;
                                </button>
                                
                                {availableCourses.length > 0 && (
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="w-full py-3.5 rounded-xl bg-secondary hover:bg-ink/5 ring-1 ring-ink/10 text-ink font-semibold text-xs uppercase tracking-wider transition"
                                    >
                                        Register for another track &rarr;
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : cachedReg ? (
                        cachedReg.status === "pending" ? (
                            <div className="bg-card ring-1 ring-ink/10 rounded-2xl p-6 md:p-8">
                                <h3 className="font-semibold text-xl mb-1">Resume Registration</h3>
                                <p className="text-sm text-ink/60 mb-6">
                                    You have a pending registration for the Summit.
                                </p>

                                <div className="flex flex-col gap-4">
                                    <div className="p-4 bg-surface ring-1 ring-ink/5 rounded-xl text-xs flex flex-col gap-2">
                                        <div><strong>Name:</strong> {cachedReg.name}</div>
                                        <div><strong>Email:</strong> {cachedReg.email}</div>
                                        <div><strong>Department:</strong> {cachedReg.department} ({cachedReg.level})</div>
                                        <div><strong>Course:</strong> {cachedReg.course}</div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleResumePayment}
                                        disabled={busy}
                                        className="w-full bg-brand text-brand-foreground py-3.5 font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 mt-2 animate-pulse"
                                    >
                                        {busy ? "Initializing..." : `Pay Registration Fee (₦${getBootcampCoursePrice(cachedReg.course).toLocaleString()}) →`}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleStartOver}
                                        className="text-xs text-center text-ink/50 hover:text-brand transition mt-2 font-medium"
                                    >
                                        Cancel & Start Over
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-card ring-1 ring-ink/10 rounded-2xl p-6 md:p-8">
                                <h3 className="font-semibold text-xl mb-1">Complete Profile</h3>
                                <p className="text-sm text-ink/60 mb-6">
                                    Choose a password to finish profile registration and access your dashboard.
                                </p>

                                <form onSubmit={handleFinishProfile} className="flex flex-col gap-4">
                                    <div className="p-4 bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-600 rounded-xl text-xs flex flex-col gap-1 font-medium">
                                        <div>✓ Registration Confirmed</div>
                                        <div className="opacity-80">Email: {cachedReg.email}</div>
                                        <div className="opacity-80">Course: {cachedReg.course}</div>
                                    </div>

                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                                            Choose Password <span className="text-brand">*</span>
                                        </span>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            minLength={6}
                                            className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={finishingProfile}
                                        className="bg-brand text-brand-foreground py-3.5 font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 mt-2"
                                    >
                                        {finishingProfile ? "Completing Profile…" : "Create Account & Go to Dashboard →"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleStartOver}
                                        className="text-xs text-center text-ink/50 hover:text-brand transition mt-2 font-medium"
                                    >
                                        Discard & Start Over
                                    </button>
                                </form>
                            </div>
                        )
                    ) : (
                        <div className="bg-card ring-1 ring-ink/10 rounded-2xl p-6 md:p-8">
                            {userRegs.length > 0 ? (
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-semibold text-xl">Register for another track</h3>
                                        <p className="text-xs text-ink/50 mt-1">Select a new course track below</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="text-xs text-brand hover:underline font-semibold"
                                    >
                                        ← Back
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="font-semibold text-xl mb-1">Register for the Summit</h3>
                                    <p className="text-sm text-ink/60 mb-6">Fill in your details below to secure your spot.</p>
                                </>
                            )}

                            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                                {user ? (
                                    <div className="p-4 bg-surface ring-1 ring-ink/5 rounded-xl text-xs flex flex-col gap-1">
                                        <span className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Registering As</span>
                                        <div className="font-semibold text-ink text-sm">{user.user_metadata?.full_name || "Student"}</div>
                                        <div className="text-ink/60">{user.email}</div>
                                    </div>
                                ) : (
                                    <>
                                        <FormField label="Full name" name="name" required placeholder="John Doe" />
                                        <FormField label="Email address" name="email" type="email" required placeholder="john@example.com" />
                                    </>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                                        I am registering as <span className="text-brand">*</span>
                                    </span>
                                    <div className="grid grid-cols-2 p-1 bg-surface ring-1 ring-ink/10 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRegType("student");
                                                if (selectedLevel === "Not a Student") {
                                                    setSelectedLevel("");
                                                }
                                            }}
                                            className={`py-2.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                                regType === "student"
                                                    ? "bg-brand text-brand-foreground shadow-sm font-bold"
                                                    : "text-ink/60 hover:text-ink hover:bg-ink/5"
                                            }`}
                                        >
                                            University Student
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRegType("non-student");
                                                setSelectedDept("");
                                                setSelectedLevel("Not a Student");
                                            }}
                                            className={`py-2.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                                regType === "non-student"
                                                    ? "bg-brand text-brand-foreground shadow-sm font-bold"
                                                    : "text-ink/60 hover:text-ink hover:bg-ink/5"
                                            }`}
                                        >
                                            General Attendee
                                        </button>
                                    </div>
                                </div>

                                <FormField 
                                    key={userRegs[0]?.phone || "phone"}
                                    label="Phone / WhatsApp" 
                                    name="phone" 
                                    required 
                                    placeholder="+234 800 000 0000" 
                                    defaultValue={userRegs[0]?.phone || user?.phone || user?.user_metadata?.phone || ""}
                                />

                                {regType === "student" && (
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                                            Department <span className="text-brand">*</span>
                                        </span>
                                        <select
                                            name="department"
                                            required
                                            value={selectedDept}
                                            onChange={(e) => setSelectedDept(e.target.value)}
                                            className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                                        >
                                            <option value="" disabled>Select your department</option>
                                            {departments.map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                <label className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                                        Select Course Track <span className="text-brand">*</span>
                                    </span>
                                    <select
                                        name="course_track"
                                        required
                                        value={selectedCourse}
                                        onChange={(e) => {
                                            setSelectedCourse(e.target.value);
                                        }}
                                        className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                                    >
                                        <option value="" disabled>Select your course track</option>
                                        {courses
                                            .filter(c => !registeredTracks.includes(c))
                                            .map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                    </select>
                                </label>

                                {regType === "student" && (
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                                            Level <span className="text-brand">*</span>
                                        </span>
                                        <select
                                            name="level"
                                            required
                                            value={selectedLevel}
                                            onChange={(e) => setSelectedLevel(e.target.value)}
                                            className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
                                        >
                                            <option value="" disabled>Select your level</option>
                                            {LEVELS.map((l) => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                {regType === "student" && isDeptStudent && (
                                    <div className="flex flex-col gap-1">
                                        <FormField 
                                            label="University Registration Number" 
                                            name="reg_no" 
                                            required 
                                            placeholder="Enter your Reg No"
                                        />
                                        <span className="text-[10px] text-ink/45 -mt-0.5">
                                            Required for CS/IT department verification.
                                        </span>
                                    </div>
                                )}

                                {isDeptStudent ? (
                                    <div className="p-3 bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-600 rounded-xl text-xs font-medium">
                                        ✓ Free admission (CS / IT department student)
                                    </div>
                                ) : selectedDept || regType === "non-student" ? (
                                    <div className="p-3 bg-brand/5 ring-1 ring-brand/20 rounded-xl text-xs text-ink/70">
                                        ₦{currentPrice.toLocaleString()} payment will be handled securely via Korapay checkout modal.
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={busy || dbLoading}
                                    className="bg-brand text-brand-foreground py-3.5 font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 mt-2 cursor-pointer"
                                >
                                    {dbLoading ? "Loading Form..." : busy ? "Registering…" : isDeptStudent ? "Register Free →" : "Register & Pay Registration Fee →"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </section>
        </SiteLayout>
    );
}

function FormField({
    label,
    name,
    type = "text",
    required,
    placeholder,
    defaultValue,
}: {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    defaultValue?: string;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                {label}{required && <span className="text-brand"> *</span>}
            </span>
            <input
                name={name}
                type={type}
                required={required}
                placeholder={placeholder}
                defaultValue={defaultValue}
                className="bg-surface ring-1 ring-ink/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
            />
        </label>
    );
}

const CAREER_TRACKS = [
  {
    name: "Frontend Web Development",
    roles: [
      {
        name: "Frontend Developer (Junior/Intermediate)",
        description: "Build responsive web interfaces, handle styling, and implement interactive elements using HTML, CSS, JavaScript, and Tailwind CSS.",
        demand: "High" as const,
        difficulty: "Beginner Friendly" as const,
        salaryLocal: "₦250,000 - ₦600,000 / month",
        salaryRemote: "$25,000 - $60,000 / year",
        skills: ["HTML5 & CSS3", "Tailwind CSS", "JavaScript ES6+", "DOM Manipulation", "Git Version Control", "Responsive Web Design"]
      },
      {
        name: "React / Next.js Specialist (Advanced)",
        description: "Develop high-performance, SEO-optimized React/Next.js applications. Implement complex client-side state management, React Query data fetching, dynamic routing, and backend integrations.",
        demand: "Very High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦500,000 - ₦1,200,000 / month",
        salaryRemote: "$45,000 - $95,000 / year",
        skills: ["React.js", "Next.js (App Router)", "TypeScript", "TanStack Query", "Zustand & Context API", "Vercel deployments", "API Integration"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: Web Fundamentals & Git Workspace",
        description: "Set up your developer environment and master structural/style languages.",
        details: ["HTML5 semantic structures for SEO and accessibility", "CSS3 layouts (Flexbox, Grid) & modern responsive designs", "Git workflow, branching, and pushing code to GitHub"]
      },
      {
        title: "Stage 2: Core Programming & Dynamic Interfaces",
        description: "Learn logical programming and how to dynamically manipulate the DOM.",
        details: ["JavaScript data types, functions, control flows, and array methods", "Asynchronous coding, fetching data from external APIs, and JSON manipulation", "DOM event handlers and UI interactive behaviors"]
      },
      {
        title: "Stage 3: Component-Driven Apps with React & TS",
        description: "Transition to state-managed, reusable components with type safety.",
        details: ["React state management (useState, useEffect, custom hooks)", "Tailwind CSS utility-first styling for speed and custom variables", "TypeScript compiler integration for robust codebases and interface schemas"]
      },
      {
        title: "Stage 4: Full Stack Integration & Deployment",
        description: "Build, route, test, and release production-ready applications.",
        details: ["Client-side routing via TanStack Router & caching with React Query", "Supabase authentication, real-time sync, and database integrations", "Vite build configuration & Vercel serverless deployment"]
      }
    ]
  },
  {
    name: "Backend Web Development",
    roles: [
      {
        name: "Backend Developer (Node/SQL)",
        description: "Program scalable application servers and design normalized relational databases. Write secure RESTful APIs, manage server middleware, and implement JWT-based user authentication.",
        demand: "High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦350,000 - ₦800,000 / month",
        salaryRemote: "$35,000 - $80,000 / year",
        skills: ["Node.js", "Express.js", "SQL Databases", "PostgreSQL", "REST APIs", "JWT Auth", "MVC Architecture"]
      },
      {
        name: "Cloud Architect (Supabase/Docker)",
        description: "Design cloud database pipelines, serverless functions, database security logic (RLS), and containerized microservices. Implement CI/CD automation, scale database connection pools, and manage cloud environments.",
        demand: "Very High" as const,
        difficulty: "Advanced" as const,
        salaryLocal: "₦650,000 - ₦1,600,000 / month",
        salaryRemote: "$60,000 - $120,000 / year",
        skills: ["Postgres Functions", "Row Level Security (RLS)", "Docker & Containers", "Supabase Backend", "GitHub Actions CI/CD", "Cloudflare CDN & Edge"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: Database Architecture & SQL",
        description: "Master data storage modeling and write high-performance query logic.",
        details: ["Relational Database Design & Entity Relationship Modeling (ERD)", "SQL queries, joins, aggregates, indexes, and performance optimization", "Supabase Postgres database tables & triggers configuration"]
      },
      {
        title: "Stage 2: Server-Side Apps with Node.js & Express",
        description: "Build robust backend servers to handle complex HTTP/REST endpoints.",
        details: ["Node.js runtime environment, filesystem, and package configurations", "Express framework routing, controller architectures, and error handling", "Environment variables, debugging tools, and standard middleware patterns"]
      },
      {
        title: "Stage 3: Secure Systems, Auth & Storage",
        description: "Design airtight security architectures and user session states.",
        details: ["JWT-based session authentication and custom middleware authorizations", "Row Level Security (RLS) policies in Postgres databases", "File upload systems, cloud storage buckets, and server-side encryption key pipelines"]
      },
      {
        title: "Stage 4: Serverless API Architecture & Cloud Deployments",
        description: "Scale API engines and build edge/serverless backends.",
        details: ["Vercel and Cloudflare Wrangler edge function deployment models", "Database connection pool management and transaction controls", "Automated pipelines, webhook receivers, and API integration testing"]
      }
    ]
  },
  {
    name: "Product Design (UI/UX)",
    roles: [
      {
        name: "UI/UX Designer",
        description: "Research user expectations, construct wireframes, and design beautiful high-fidelity software screens in Figma. Formulate user personas, map navigation journeys, and run usability feedback tests.",
        demand: "High" as const,
        difficulty: "Beginner Friendly" as const,
        salaryLocal: "₦200,000 - ₦600,000 / month",
        salaryRemote: "$30,000 - $70,000 / year",
        skills: ["Figma Basics", "UX Research", "User Personas", "Wireframing", "UI Styling", "Usability Testing", "Interactive Prototypes"]
      },
      {
        name: "Senior Product Designer",
        description: "Scale interface designs by building reusable component-driven libraries and design systems in Figma. Lead product research, align visual design with development tokens, and structure premium responsive dashboard systems.",
        demand: "Very High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦500,000 - ₦1,200,000 / month",
        salaryRemote: "$45,000 - $95,000 / year",
        skills: ["Design Systems", "Figma Auto-Layout & Variables", "Component Libraries", "UX Strategy", "Developer Handoff", "Interactive micro-animations"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: UX Strategy & User Research",
        description: "Step into the user's shoes to understand their core needs and pain points.",
        details: ["User research strategies, empathy maps, and demographic personas", "Information architecture (IA) map logic and user flow outlines", "Ideation, brainwrites, and wireframing layout plans using FigJam"]
      },
      {
        title: "Stage 2: UI Design Fundamentals & Figma Studio",
        description: "Learn visual hierarchy, spacing systems, and software configurations.",
        details: ["Visual guidelines: typography scale, grids, and harmonious color theory", "Figma software mechanics: vectors, component frames, and constraints", "Low-fidelity interactive wireframes for rapid user validation tests"]
      },
      {
        title: "Stage 3: Advanced Figma & Design Systems",
        description: "Develop scalable libraries that speed up product development teams.",
        details: ["Figma auto-layout rules, nesting, responsive frames, and variables", "Design Systems: interactive components, variants, variables, and themes", "High-fidelity screens built with pixel-perfect visual details"]
      },
      {
        title: "Stage 4: Prototyping, Usability & Portfolio Cases",
        description: "Transform static designs into interactive simulations and present them.",
        details: ["Advanced transitions, micro-interactions, smart animate, and variable states", "Usability test session facilitation and iteration based on feedback logs", "UX Case Study writing & professional Behance/Figma portfolio presentation"]
      }
    ]
  },
  {
    name: "Mobile App Development",
    roles: [
      {
        name: "React Native Developer",
        description: "Compile cross-platform iOS and Android mobile apps from a single JavaScript/TypeScript codebase using React Native. Connect APIs, manage device storage, and handle user navigation.",
        demand: "High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦300,000 - ₦750,000 / month",
        salaryRemote: "$35,000 - $80,000 / year",
        skills: ["React Native", "Expo CLI", "TypeScript", "Mobile Navigation", "Local Storage", "API Integrations", "App Store Deployments"]
      },
      {
        name: "Mobile Systems Engineer",
        description: "Engineer native platform applications using Swift/SwiftUI for iOS and Kotlin/Jetpack Compose for Android. Integrate device-native features (GPS, background tasks, camera APIs) and optimize app performance.",
        demand: "Very High" as const,
        difficulty: "Advanced" as const,
        salaryLocal: "₦600,000 - ₦1,500,000 / month",
        salaryRemote: "$50,000 - $115,000 / year",
        skills: ["Swift & SwiftUI", "Kotlin & Jetpack Compose", "Native Device APIs", "Mobile Performance Tuning", "Memory Management", "Multithreading"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: Mobile UI & React Native Core",
        description: "Configure cross-platform mobile runtimes and learn mobile layouts.",
        details: ["React Native architecture vs standard DOM-based web code", "Expo setup, running code on physical simulator devices", "Native layout structures using Flexbox & React Native Core styles"]
      },
      {
        title: "Stage 2: Advanced Mobile Navigation & Styling",
        description: "Design fluid screens and smooth page transitions.",
        details: ["Expo Router navigation configurations (Tabs, Stacks, Drawers)", "Custom mobile design systems and Tailwind Native styling adapters", "Form validation, key inputs, and text management for touchscreens"]
      },
      {
        title: "Stage 3: Hardware Integrations & Core Data Storage",
        description: "Tap into native APIs and store data locally for offline capability.",
        details: ["Integrating device features: Camera, Location, and Bio-Auth locks", "Storing user sessions securely using Expo SecureStore and MMKV", "API fetches, network status listeners, and cache strategies"]
      },
      {
        title: "Stage 4: Release pipelines & App Store Publishing",
        description: "Prepare and deploy apps for user distribution.",
        details: ["Build configurations, app icons, and launch screens", "Expo Application Services (EAS) cloud builds for Android & iOS", "App Store Connect & Google Play Console app submission rules"]
      }
    ]
  },
  {
    name: "Cyber Security",
    roles: [
      {
        name: "Cyber Security Analyst (Entry-Level)",
        description: "Defend organizations against active cyber attacks. Monitor security systems, analyze firewalls, investigate suspicious traffic, and triage security alerts in a Security Operations Center (SOC).",
        demand: "Very High" as const,
        difficulty: "Beginner Friendly" as const,
        salaryLocal: "₦300,000 - ₦750,000 / month",
        salaryRemote: "$40,000 - $85,000 / year",
        skills: ["Security Operations (SOC)", "SIEM tools (Splunk/ELK)", "Log Analysis", "Incident Triage", "Firewalls", "Wireshark Packet Analysis"]
      },
      {
        name: "Ethical Hacker / Penetration Tester",
        description: "Conduct authorized attack simulation drills on target servers, web apps, and APIs. Identify vulnerabilities, run exploits, and write detailed remediation guidelines to secure systems.",
        demand: "Very High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦500,000 - ₦1,400,000 / month",
        salaryRemote: "$50,000 - $110,000 / year",
        skills: ["Penetration Testing", "Nmap & Scanning", "Metasploit exploit framework", "Burp Suite Proxy", "OWASP Top 10 vulnerabilities", "Privilege Escalation"]
      },
      {
        name: "IT Auditor & Compliance Officer",
        description: "Review and audit security systems to ensure they comply with compliance frameworks (SOC 2, ISO 27001, PCI-DSS, GDPR). Perform risk assessment, inspect logs, and manage risk registries.",
        demand: "High" as const,
        difficulty: "Beginner Friendly" as const,
        salaryLocal: "₦350,000 - ₦1,000,000 / month",
        salaryRemote: "$45,000 - $95,000 / year",
        skills: ["IT Audit Principles", "Compliance Frameworks (ISO/SOC2)", "Risk Assessment", "Security Policy Audits", "Data Governance", "Access Reviews"]
      },
      {
        name: "Security Architect & Cloud Defense",
        description: "Architect secure networks, construct perimeter firewalls, and automate security scans (SAST/DAST) in deployment pipelines. Secure cloud operations and implement zero-trust access controls.",
        demand: "Very High" as const,
        difficulty: "Advanced" as const,
        salaryLocal: "₦700,000 - ₦2,000,000 / month",
        salaryRemote: "$70,000 - $160,000 / year",
        skills: ["DevSecOps CI/CD integration", "Cloud Security Architectures", "Cryptography", "Infrastructure as Code Security", "Zero Trust Identity", "Threat Modeling"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: Linux Operating Systems & Network Layers",
        description: "Build an airtight understanding of computer communications and shell controls.",
        details: ["Linux OS structure, command shell scripting, and user permission models", "Networking essentials: TCP/IP stack, routing tables, DNS, and ports", "Analyzing network packets and traffic protocols using Wireshark"]
      },
      {
        title: "Stage 2: Reconnaissance & Vulnerability Discovery",
        description: "Act like an attacker to discover exposed surfaces and target entries.",
        details: ["Information gathering, OSINT searches, and domain footprints", "Active scanning, host detection, and network analysis using Nmap", "Vulnerability databases research and exploit mapping"]
      },
      {
        title: "Stage 3: Practical Exploits & Web App Vulnerabilities",
        description: "Uncover and exploit application flaws to understand how they are defended.",
        details: ["Burp Suite interception proxy, request manipulation, and analysis", "OWASP Top 10 exploits: SQL Injection, XSS, broken access controls", "Privilege escalations, session hijackings, and lateral movements"]
      },
      {
        title: "Stage 4: Defense, Auditing & Incident Handling",
        description: "Build perimeter walls and mitigate system breeches.",
        details: ["Firewall management, port filtering, and system audit logs", "Identity management, patch updates, and security policy rules", "Incident response strategies: evidence isolation, analysis, and containment"]
      }
    ]
  },
  {
    name: "Data Analysis with Python",
    roles: [
      {
        name: "Data Analyst (SQL & Python cleaning)",
        description: "Clean messy datasets, write database SQL queries, and construct data charts to extract facts from raw business operations.",
        demand: "High" as const,
        difficulty: "Beginner Friendly" as const,
        salaryLocal: "₦250,000 - ₦650,000 / month",
        salaryRemote: "$30,000 - $65,000 / year",
        skills: ["Python script writing", "SQL database joins", "Pandas DataFrames", "Data Cleaning", "Matplotlib & Seaborn"]
      },
      {
        name: "Business Intelligence Analyst (PowerBI & Pandas)",
        description: "Build visual dashboards, design interactive key performance indicators (KPIs), write data models, and structure analytical reports using Power BI and advanced Pandas pipelines.",
        demand: "High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦450,000 - ₦1,100,000 / month",
        salaryRemote: "$40,000 - $80,000 / year",
        skills: ["Power BI", "DAX Data Formulas", "Pandas Advanced Pivot", "Interactive Dashboard Design", "Data Modeling", "Business KPI formulation"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: SQL & Data Foundations",
        description: "Master database querying and relational data modeling.",
        details: ["Relational Database logic, schemas, and relational entities", "SQL queries, joins, aggregates, groupings, and data filtering", "Database import/export routines and structural integrations"]
      },
      {
        title: "Stage 2: Python scripting & Data Wrangling",
        description: "Write clean data pipelines to clean, restructure, and analyze raw tables.",
        details: ["Python core data types, loops, lists, dicts, and functions", "Pandas DataFrame structures, loading CSV/JSON files, and index selectors", "NumPy array calculations, missing value treatments, and table joins"]
      },
      {
        title: "Stage 3: Visual Analytics & Reporting Dashboard",
        description: "Design interactive reports and visual storytelling components.",
        details: ["Matplotlib & Seaborn charting libraries (Bar, Line, Scatter, Hist)", "Power BI visual dashboard structures, DAX formulas, and charts", "Deploying interactive web reports and analytical storytelling patterns"]
      },
      {
        title: "Stage 4: Statistical Modeling & Capstone Case Study",
        description: "Apply statistical logic to support real business actions.",
        details: ["Descriptive stats, probability distributions, and hypotheses testing", "A/B testing strategies, correlations, and regression trends", "Compiling a professional Jupyter analytics report published on GitHub"]
      }
    ]
  },
  {
    name: "AI & Machine Learning",
    roles: [
      {
        name: "Machine Learning Engineer (Regression & Classification)",
        description: "Develop statistical algorithms to predict trends, classify categories, and partition data structures using Scikit-Learn libraries.",
        demand: "High" as const,
        difficulty: "Intermediate" as const,
        salaryLocal: "₦400,000 - ₦950,000 / month",
        salaryRemote: "$45,000 - $95,000 / year",
        skills: ["Python for ML", "Scikit-Learn models", "Supervised Learning", "Regression & Classification", "Model evaluation metrics"]
      },
      {
        name: "Deep Learning & NLP Specialist (TensorFlow & LLMs)",
        description: "Construct artificial neural networks for complex computer vision and text analysis. Fine-tune LLMs, integrate transformers, and deploy model APIs.",
        demand: "Very High" as const,
        difficulty: "Advanced" as const,
        salaryLocal: "₦750,000 - ₦1,700,000 / month",
        salaryRemote: "$65,000 - $130,000 / year",
        skills: ["TensorFlow & Keras", "Convolutional Networks (CNN)", "Large Language Models", "HuggingFace Transformers", "API Model Deployment", "GPU computing"]
      }
    ],
    roadmap: [
      {
        title: "Stage 1: Linear Algebra, Calculus & Data Prep",
        description: "Configure core mathematical concepts used in statistical learning models.",
        details: ["Matrix multiplication, vector projections, and gradient calculus", "Feature scaling, normalize, standardize, and encode operations", "Splitting train/test data splits and cross-validation plans"]
      },
      {
        title: "Stage 2: Statistical Models with Scikit-Learn",
        description: "Implement predictive ML models for regression and classification.",
        details: ["Linear and Logistic Regression, Decision Trees, and Random Forests", "Unsupervised clustering (K-Means, PCA dimensional reduction)", "Model metrics evaluation: Accuracy, Precision, Recall, F1, ROC-AUC"]
      },
      {
        title: "Stage 3: Deep Learning & Neural Networks",
        description: "Construct neural layer architectures using modern deep learning platforms.",
        details: ["Perceptrons, multi-layer feed-forward structures, backpropagations", "Building image classifiers (CNNs) and sequential trackers (RNNs/LSTMs)", "TensorFlow, Keras, and GPU-driven model execution environments"]
      },
      {
        title: "Stage 4: NLP, Transformers & Production Deploy",
        description: "Fine-tune advanced LLM models and package them for API release.",
        details: ["Word embeddings, attention engines, and Transformer frameworks", "Fine-tuning pre-trained models and prompt engineering frameworks", "Deploying model weights as secure REST APIs via FastAPI and Docker"]
      }
    ]
  }
];

function CareerPathExplorer() {
    const [selectedTrack, setSelectedTrack] = useState(CAREER_TRACKS[0].name);
    const activeTrack = CAREER_TRACKS.find(t => t.name === selectedTrack) || CAREER_TRACKS[0];

    // Maintain state for selected sub-role name
    const [selectedRoleName, setSelectedRoleName] = useState(activeTrack.roles[0].name);

    // Sync selected role when track changes
    useEffect(() => {
        setSelectedRoleName(activeTrack.roles[0].name);
    }, [selectedTrack]);

    const activeRole = activeTrack.roles.find(r => r.name === selectedRoleName) || activeTrack.roles[0];

    function getTrackIcon(name: string) {
        switch (name) {
            case "Frontend Web Development":
                return <Terminal className="size-5" />;
            case "Backend Web Development":
                return <Database className="size-5" />;
            case "Product Design (UI/UX)":
                return <Palette className="size-5" />;
            case "Mobile App Development":
                return <Smartphone className="size-5" />;
            case "Cyber Security":
                return <Shield className="size-5" />;
            case "Data Analysis with Python":
                return <TrendingUp className="size-5" />;
            case "AI & Machine Learning":
                return <Award className="size-5" />;
            default:
                return <Layers className="size-5" />;
        }
    }

    return (
        <section className="px-6 py-20 border-t border-ink/10 bg-surface/40">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="flex flex-col gap-4 mb-16 text-center max-w-3xl mx-auto">
                    <div className="flex items-center justify-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-brand">
                        <span className="h-px w-8 bg-brand" />
                        <span>Interactive Roadmap</span>
                        <span className="h-px w-8 bg-brand" />
                    </div>
                    <h2 className="font-display text-4xl md:text-6xl tracking-wide uppercase text-ink leading-none">
                        Choose Your <span className="text-brand">Career</span> Path
                    </h2>
                    <p className="text-ink/65 text-sm md:text-base leading-relaxed">
                        Don't just take a class. Pick a structured, industry-aligned career track designed to turn you from complete beginner into a high-demand tech professional.
                    </p>
                </div>

                {/* Track Selector Tabs */}
                <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5 mb-10">
                    {CAREER_TRACKS.map((t) => {
                        const isSelected = selectedTrack === t.name;
                        return (
                            <button
                                key={t.name}
                                onClick={() => setSelectedTrack(t.name)}
                                className={`flex flex-col md:flex-row items-center gap-2.5 p-4 rounded-xl text-center md:text-left border transition-all cursor-pointer select-none ${
                                    isSelected
                                        ? "bg-brand text-brand-foreground border-brand shadow-sm font-semibold"
                                        : "bg-card border-ink/10 text-ink/75 hover:bg-ink/5 hover:border-ink/20"
                                }`}
                            >
                                <span className={`shrink-0 ${isSelected ? "text-brand-foreground" : "text-brand"}`}>
                                    {getTrackIcon(t.name)}
                                </span>
                                <span className="text-[10px] md:text-[11px] font-bold tracking-wide uppercase line-clamp-2 md:line-clamp-none">{t.name.replace(" Web Development", "").replace(" App Development", "")}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
                    
                    {/* Left Column — Detailed Path & Syllabus Roadmap */}
                    <div className="flex flex-col gap-8">
                        {/* Summary Block */}
                        <div className="bg-card border border-ink/10 rounded-2xl p-6 md:p-8">
                            {/* Specialization selector */}
                            <div className="flex flex-col gap-2.5 mb-6 pb-6 border-b border-ink/5">
                                <span className="text-[10px] uppercase tracking-[0.15em] text-brand font-semibold">Specialization Roles / Tracks</span>
                                <div className="flex flex-wrap gap-2">
                                    {activeTrack.roles.map((r) => {
                                        const isRoleSelected = selectedRoleName === r.name;
                                        return (
                                            <button
                                                key={r.name}
                                                onClick={() => setSelectedRoleName(r.name)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none ${
                                                    isRoleSelected
                                                        ? "bg-brand/15 border-brand text-brand shadow-sm"
                                                        : "bg-surface/50 border-ink/10 text-ink/65 hover:bg-ink/5"
                                                }`}
                                            >
                                                {r.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <div>
                                    <span className="text-[10px] uppercase tracking-widest text-brand font-semibold block mb-1">Target Job Role</span>
                                    <h3 className="font-display text-2xl md:text-3xl text-ink uppercase tracking-wide">{activeRole.name}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 uppercase tracking-wider">
                                        {activeRole.difficulty}
                                    </span>
                                </div>
                            </div>
                            <p className="text-ink/65 text-sm leading-relaxed">{activeRole.description}</p>
                        </div>

                        {/* Visual Learning Timeline */}
                        <div>
                            <h4 className="font-display text-xl uppercase tracking-wide text-ink mb-6 flex items-center gap-2 font-semibold">
                                <Layers className="size-4 text-brand" /> Learning Syllabus Timeline
                            </h4>
                            <div className="relative border-l-2 border-brand/20 ml-3 pl-6 space-y-8 py-2">
                                {activeTrack.roadmap.map((step, idx) => (
                                    <div key={idx} className="relative group">
                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[33px] top-1.5 size-4 rounded-full bg-surface border-2 border-brand flex items-center justify-center transition-all group-hover:scale-125">
                                            <div className="size-1.5 rounded-full bg-brand animate-ping opacity-75 absolute" />
                                            <div className="size-1.5 rounded-full bg-brand" />
                                        </div>
                                        {/* Card Content */}
                                        <div className="bg-card border border-ink/10 hover:border-brand/35 rounded-xl p-5 transition-all">
                                            <div className="flex items-center gap-2.5 mb-2">
                                                <span className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand/10 px-2 py-0.5 rounded">
                                                    Stage {idx + 1}
                                                </span>
                                                <h5 className="font-semibold text-sm text-ink">{step.title}</h5>
                                            </div>
                                            <p className="text-xs text-ink/60 mb-3">{step.description}</p>
                                            <ul className="space-y-1.5">
                                                {step.details.map((d, dIdx) => (
                                                    <li key={dIdx} className="text-xs text-ink/75 flex items-start gap-2">
                                                        <span className="text-brand shrink-0 mt-0.5">✓</span>
                                                        <span>{d}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column — Career Stats & Technologies */}
                    <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                        {/* Outlook card */}
                        <div className="bg-contrast text-contrast-foreground rounded-2xl p-6 border border-brand/10 shadow-lg relative overflow-hidden">
                            {/* Background overlay design details */}
                            <div className="absolute -right-16 -top-16 size-40 bg-brand/10 rounded-full blur-2xl pointer-events-none" />
                            
                            <h4 className="font-display text-lg uppercase tracking-wider text-contrast-foreground mb-6 flex items-center gap-2">
                                <TrendingUp className="size-4 text-brand" /> Job Outlook & Rewards
                            </h4>

                            <div className="space-y-5">
                                <div className="border-b border-contrast-foreground/10 pb-4">
                                    <div className="text-[10px] text-contrast-foreground/50 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                        <Briefcase className="size-3 text-brand" /> Job Market Demand
                                    </div>
                                    <div className="text-lg font-bold mt-1 flex items-center gap-2">
                                        {activeRole.demand}
                                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>

                                <div className="border-b border-contrast-foreground/10 pb-4">
                                    <div className="text-[10px] text-contrast-foreground/50 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                        <Coins className="size-3 text-brand" /> Est. Salary (Nigeria)
                                    </div>
                                    <div className="text-lg font-bold text-brand mt-1 tabular-nums">
                                        {activeRole.salaryLocal}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-contrast-foreground/50 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                        <Globe className="size-3 text-brand" /> Est. Salary (Remote / Global)
                                    </div>
                                    <div className="text-lg font-bold text-contrast-foreground mt-1 tabular-nums">
                                        {activeRole.salaryRemote}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills/Tools Card */}
                        <div className="bg-card border border-ink/10 rounded-2xl p-6">
                            <h4 className="font-display text-sm uppercase tracking-wider text-ink mb-4 flex items-center gap-2 font-semibold">
                                <Award className="size-4 text-brand" /> Covered Tools & Technologies
                            </h4>
                            <p className="text-xs text-ink/50 mb-4">
                                Master these industry-standard systems and tools to build a strong professional profile.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {activeRole.skills.map((s, idx) => (
                                    <span
                                        key={idx}
                                        className="text-[10px] font-medium tracking-wide uppercase px-2.5 py-1.5 bg-surface text-ink/80 rounded-lg ring-1 ring-ink/15 hover:ring-brand/40 transition-colors"
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Prompt to register */}
                        <div className="p-4 bg-brand/5 border border-brand/20 rounded-xl flex items-center justify-between gap-4">
                            <div className="text-xs text-ink/75">
                                Ready to join? secure your slot for this track.
                            </div>
                            <span className="text-brand shrink-0">
                                <ArrowRight className="size-4 animate-bounce" />
                            </span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    );
}

const COURSE_ROLES: Record<string, { name: string; price: number }[]> = {
    "Frontend Web Development": [
        { name: "Frontend Developer (Junior/Intermediate)", price: 5000 },
        { name: "React / Next.js Specialist (Advanced)", price: 7500 }
    ],
    "Backend Web Development": [
        { name: "Backend Developer (Node/SQL)", price: 5000 },
        { name: "Cloud Architect (Supabase/Docker)", price: 8000 }
    ],
    "Product Design (UI/UX)": [
        { name: "UI/UX Designer", price: 5000 },
        { name: "Senior Product Designer & Design System Architect", price: 7500 }
    ],
    "Mobile App Development": [
        { name: "Mobile App Developer (React Native)", price: 5000 },
        { name: "Mobile Systems Engineer (iOS & Android Native)", price: 8000 }
    ],
    "Cyber Security": [
        { name: "Cyber Security Analyst (Entry-Level)", price: 5000 },
        { name: "Ethical Hacker / Penetration Tester", price: 8000 },
        { name: "IT Auditor & Compliance Officer", price: 8000 },
        { name: "Security Architect & Cloud Defense", price: 12000 }
    ],
    "Data Analysis with Python": [
        { name: "Data Analyst (SQL & Python cleaning)", price: 5000 },
        { name: "Business Intelligence Analyst (PowerBI & Pandas)", price: 8000 }
    ],
    "AI & Machine Learning": [
        { name: "Machine Learning Engineer (Regression & Classification)", price: 6000 },
        { name: "Deep Learning & NLP Specialist (TensorFlow & LLMs)", price: 10000 }
    ]
};

function getRolesForCourse(courseName: string): { name: string; price: number }[] {
    if (!courseName) return [];
    const matched = Object.keys(COURSE_ROLES).find(k => k.toLowerCase() === courseName.toLowerCase()) || 
                    Object.keys(COURSE_ROLES).find(k => courseName.toLowerCase().includes(k.toLowerCase()));
    if (matched) {
        return COURSE_ROLES[matched];
    }
    return [{ name: `${courseName} General Track`, price: 5000 }];
}

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.015-5.08-2.859-6.927C16.378 2.032 13.911 1.016 11.99 1.016c-5.407 0-9.813 4.398-9.817 9.8-.001 1.564.423 3.09 1.226 4.453l-1.014 3.702 3.805-.989zM16.5 13.5c-.27-.13-1.59-.785-1.84-.875-.25-.09-.43-.13-.61.13-.18.26-.71.875-.87 1.055-.16.18-.32.2-.59.07-2.3-1.12-3.66-2.58-4.22-3.55-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.61-1.475-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.47.07-.72.34-.25.27-.96.94-.96 2.29s.98 2.64 1.12 2.82c.14.18 1.93 2.94 4.67 4.12.65.28 1.16.45 1.56.57.66.21 1.25.18 1.72.11.52-.08 1.59-.65 1.81-1.27.22-.63.22-1.16.16-1.27-.06-.11-.22-.18-.49-.31z" />
  </svg>
);
