import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Calendar, CreditCard, Award, CheckCircle, Clock, BookOpen, Trash2, Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { approveVerification, sendBulkMessage } from "@/lib/forms.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bootcamp")({
  component: AdminBootcampPage,
});

type Registration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  level: string;
  course: string | null;
  payment_status: string;
  payment_reference: string | null;
  created_at: string;
  reg_no: string | null;
  verification_status: string | null;
};

const DEFAULT_MILESTONES = [
  { id: "ms-1", title: "Git & Workspace Setup" },
  { id: "ms-2", title: "Module 1 Exam Passed" },
  { id: "ms-3", title: "Mid-term Project Submission" },
  { id: "ms-4", title: "Summit Capstone Approved" }
];

function AdminBootcampPage() {
  const [activeTab, setActiveTab] = useState<"registrations" | "instructor">("registrations");
  const [rows, setRows] = useState<Registration[]>([]);
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgress, setSelectedProgress] = useState<any | null>(null);
  const [milestonesUpdate, setMilestonesUpdate] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("All");
  const [isMessaging, setIsMessaging] = useState(false);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  const [isWhatsappModal, setIsWhatsappModal] = useState(false);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("okike_whatsapp_group_link") || "" : ""));
  const [whatsappTemplate, setWhatsappTemplate] = useState("Hello {{name}}, this is the OKIKE team. We noticed you registered for the bootcamp, but you are not yet in the WhatsApp community. Please join using this link to receive all announcements and class updates:\n\n{{link}}");
  const [whatsappQueue, setWhatsappQueue] = useState<Registration[]>([]);
  const [whatsappQueueIndex, setWhatsappQueueIndex] = useState(0);
  const [whatsappCustomMsg, setWhatsappCustomMsg] = useState("");

  useEffect(() => {
    const student = whatsappQueue[whatsappQueueIndex];
    if (student) {
      const msg = whatsappTemplate
        .replace(/{{name}}/g, student.name)
        .replace(/{{link}}/g, whatsappGroupLink);
      setWhatsappCustomMsg(msg);
    }
  }, [whatsappQueue, whatsappQueueIndex, whatsappTemplate, whatsappGroupLink]);

  function formatWhatsAppPhone(phone: string) {
    let clean = phone.replace(/[^\d]/g, "");
    if (clean.startsWith("0")) {
      clean = "234" + clean.slice(1);
    }
    return clean;
  }

  const verifyFn = useServerFn(approveVerification);
  const sendBulkEmailFn = useServerFn(sendBulkMessage);
  const { user, role } = useAuth();


  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected registration(s)?`)) return;

    const { error } = await (supabase as any)
      .from("bootcamp_registrations")
      .delete()
      .in("id", selectedIds);

    if (!error) {
      toast.success("Selected registrations deleted successfully!");
      setSelectedIds([]);
      load();
    } else {
      toast.error("Could not delete registrations. Please try again.");
    }
  }

  async function load() {
    const { data } = await (supabase as any)
      .from("bootcamp_registrations")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Registration[]);
    setLoading(false);
  }

  async function loadProgress() {
    const { data } = await (supabase as any)
      .from("student_progress")
      .select("*")
      .order("updated_at", { ascending: false });
    setProgressRows(data ?? []);
  }

  async function updateVerification(id: string, status: "approved" | "rejected") {
    const loadingToast = toast.loading(`Updating status to ${status}...`);
    try {
      const res = await verifyFn({ data: { id, status } });
      toast.dismiss(loadingToast);
      if (res.ok) {
        toast.success(`Registration status updated to ${status}!`);
        load();
      } else {
        toast.error(res.error || "Failed to update verification status.");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "An error occurred.");
    }
  }

  useEffect(() => {
    load();
    loadProgress();
  }, []);

  async function saveMilestones() {
    if (!selectedProgress) return;
    const { error } = await (supabase as any)
      .from("student_progress")
      .update({
        milestone_status: milestonesUpdate,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedProgress.id);

    if (!error) {
      toast.success("Student roadmap milestones updated successfully!");
      setSelectedProgress(null);
      loadProgress();
    } else {
      toast.error("Could not update milestones. Please try again.");
    }
  }

  const filteredRegistrations = rows.filter(r => {
    if (courseFilter === "All") return true;
    return r.course === courseFilter;
  });

  const total = filteredRegistrations.length;
  const deptStudents = filteredRegistrations.filter((r) => r.payment_status === "free").length;
  const paidCount = filteredRegistrations.filter((r) => r.payment_status === "paid").length;
  const pendingCount = filteredRegistrations.filter((r) => r.payment_status === "pending").length;

  const uniqueCourses = Array.from(new Set(rows.map(r => r.course).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-2 text-ink">
            <GraduationCap className="size-6 text-brand" /> Synergy Summit Console
          </h1>
          <p className="text-sm text-ink/65 mt-1">Manage attendees and track student learning workspaces.</p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-4 items-center">
          {activeTab === "registrations" && uniqueCourses.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none"
            >
              <option value="All">All Courses</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <div className="flex gap-1 bg-surface p-1 rounded-xl ring-1 ring-ink/10">
            <button
              onClick={() => setActiveTab("registrations")}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition ${
                activeTab === "registrations" ? "bg-brand text-brand-foreground shadow" : "text-ink/60 hover:text-ink"
              }`}
            >
              Registrations
            </button>
            <button
              onClick={() => {
                setActiveTab("instructor");
                loadProgress();
              }}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition ${
                activeTab === "instructor" ? "bg-brand text-brand-foreground shadow" : "text-ink/60 hover:text-ink"
              }`}
            >
              Instructor Control
            </button>
          </div>
        </div>
      </div>

      {activeTab === "registrations" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Total Registered" value={String(total)} />
            <Tile label="CS/IT (Free)" value={String(deptStudents)} />
            <Tile label="Paid (₦5,000)" value={String(paidCount)} />
            <Tile label="Pending Payment" value={String(pendingCount)} />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between bg-surface border border-ink/10 rounded-2xl p-4 mt-3 transition-all shadow-sm">
              <span className="text-sm font-medium text-ink flex items-center gap-2">
                <CheckCircle className="size-4 text-brand" /> {selectedIds.length} registration{selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMessaging(true)}
                  className="bg-brand hover:bg-brand/90 text-brand-foreground px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 shadow-sm"
                >
                  <Mail className="size-4" /> Message Selected
                </button>
                <button
                  onClick={() => {
                    const selected = rows.filter(r => selectedIds.includes(r.id));
                    setWhatsappQueue(selected);
                    setWhatsappQueueIndex(0);
                    setIsWhatsappModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 shadow-sm"
                >
                  <WhatsappIcon className="size-4" /> WhatsApp Selected
                </button>
                <button
                  onClick={deleteSelected}
                  className="bg-red-600/10 hover:bg-red-600/20 text-red-600 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2"
                >
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
            </div>
          )}

          <section className="bg-card rounded-2xl ring-1 ring-ink/10 overflow-hidden mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ink/10 bg-surface text-ink/60 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-4 py-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRegistrations.length > 0 && selectedIds.length === filteredRegistrations.length}
                        onChange={toggleSelectAll}
                        className="rounded border-ink/20 text-brand focus:ring-brand cursor-pointer size-4"
                      />
                    </th>
                    <th className="px-6 py-4">Student Info</th>
                    <th className="px-6 py-4">Academic Details</th>
                    <th className="px-6 py-4">Course Track</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4">Date Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-ink/40">
                        Loading registrations...
                      </td>
                    </tr>
                  ) : filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-ink/40">
                        No registrations found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((r) => (
                      <tr key={r.id} className="hover:bg-ink/5 transition">
                        <td className="px-4 py-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="rounded border-ink/20 text-brand focus:ring-brand cursor-pointer size-4"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="text-xs text-ink/50 mt-0.5">{r.email}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-ink/40 font-mono">{r.phone || "—"}</span>
                            {r.phone && (
                              <button
                                onClick={() => {
                                  setWhatsappQueue([r]);
                                  setWhatsappQueueIndex(0);
                                  setIsWhatsappModal(true);
                                }}
                                className="text-emerald-500 hover:text-emerald-600 transition p-0.5 rounded hover:bg-emerald-500/10"
                                title="WhatsApp Reminder"
                              >
                                <WhatsappIcon className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-ink">{r.department}</div>
                          <div className="text-xs text-ink/50 mt-0.5">{r.level}</div>
                          {r.reg_no && (
                            <div className="text-[10px] bg-brand/5 border border-brand/10 text-brand px-1.5 py-0.5 rounded mt-1.5 font-mono inline-block">
                              Reg: {r.reg_no}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-ink">
                          {r.course ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            r.payment_status === "paid"
                              ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"
                              : r.payment_status === "free"
                                ? "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20"
                          }`}>
                            {r.payment_status}
                          </span>

                          {r.payment_status === "free" && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                r.verification_status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : r.verification_status === "rejected"
                                    ? "bg-red-500/10 text-red-600"
                                    : "bg-amber-500/10 text-amber-600 animate-pulse"
                              }`}>
                                {r.verification_status || "pending"}
                              </span>

                              {(r.verification_status === "pending" || !r.verification_status) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => updateVerification(r.id, "approved")}
                                    className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-semibold hover:opacity-90 transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => updateVerification(r.id, "rejected")}
                                    className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] font-semibold hover:opacity-90 transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {r.payment_reference && (
                            <div className="text-[10px] text-ink/40 font-mono mt-1 select-all" title="Reference">
                              Ref: {r.payment_reference}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-ink/60 text-xs">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Progress List Table */}
          <div className="lg:col-span-8 bg-card rounded-2xl ring-1 ring-ink/10 overflow-hidden">
            <div className="p-5 border-b border-ink/10">
              <h3 className="font-semibold text-ink">Student Academic Trackers</h3>
              <p className="text-xs text-ink/55 mt-1">Real-time lesson completions, quiz grades, and milestones.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ink/10 bg-surface text-ink/60 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Student Email</th>
                    <th className="px-6 py-4">Lessons Complete</th>
                    <th className="px-6 py-4">Quiz Scores</th>
                    <th className="px-6 py-4">Milestones</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {progressRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-ink/40">
                        No student progress rows active yet.
                      </td>
                    </tr>
                  ) : (
                    progressRows.map((p) => {
                      const completedCount = p.lessons_completed?.length || 0;
                      const scores = p.quiz_scores || {};
                      const milestones = p.milestone_status || {};
                      const completedMilestones = Object.values(milestones).filter(s => s === "completed").length;

                      return (
                        <tr key={p.id} className="hover:bg-ink/5 transition text-xs">
                          <td className="px-6 py-4 font-semibold text-ink">{p.student_email}</td>
                          <td className="px-6 py-4 font-mono">{completedCount} lessons</td>
                          <td className="px-6 py-4">
                            {Object.keys(scores).length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {Object.entries(scores).map(([qid, val]) => (
                                  <span key={qid} className="font-mono text-[10px]">{qid}: {val as any}%</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink/40 italic">No attempts</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono">{completedMilestones}/4 approved</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedProgress(p);
                                setMilestonesUpdate(p.milestone_status || {});
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground font-semibold hover:opacity-90"
                            >
                              Edit Roadmap
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit milestones sidebar */}
          {selectedProgress ? (
            <div className="lg:col-span-4 bg-card rounded-2xl ring-1 ring-ink/10 p-6 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-ink">Update Student Milestones</h3>
                <p className="text-xs text-ink/50 mt-0.5 truncate">{selectedProgress.student_email}</p>
              </div>

              <div className="flex flex-col gap-4 border-t border-ink/5 pt-4">
                {DEFAULT_MILESTONES.map((m) => {
                  const status = milestonesUpdate[m.id] || "pending";
                  return (
                    <div key={m.id} className="flex flex-col gap-2 p-3 bg-surface rounded-xl">
                      <div className="text-xs font-semibold text-ink">{m.title}</div>
                      <div className="flex gap-2 mt-1">
                        {["pending", "in_progress", "completed"].map((st) => (
                          <button
                            key={st}
                            onClick={() => setMilestonesUpdate(prev => ({ ...prev, [m.id]: st }))}
                            className={`flex-1 text-[10px] uppercase font-semibold py-1 rounded transition ${
                              status === st
                                ? st === "completed"
                                  ? "bg-emerald-500 text-white"
                                  : st === "in_progress"
                                    ? "bg-amber-500 text-white"
                                    : "bg-ink/60 text-white"
                                : "bg-ink/5 hover:bg-ink/10 text-ink/60"
                            }`}
                          >
                            {st === "in_progress" ? "Working" : st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveMilestones}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition"
                >
                  Save Updates
                </button>
                <button
                  onClick={() => setSelectedProgress(null)}
                  className="px-4 py-2.5 rounded-xl bg-surface ring-1 ring-ink/10 text-xs font-semibold uppercase tracking-wider hover:bg-ink/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-4 bg-surface rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/50 text-xs uppercase tracking-wider">
              Select a student to edit milestones
            </div>
          )}
        </div>
      )}

      {isMessaging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setIsMessaging(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card ring-1 ring-border rounded-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <Mail className="size-5 text-brand" /> Send Bulk Message
            </h2>
            <p className="text-sm text-ink/60 mb-5">
              You are drafting an email to <strong>{selectedIds.length}</strong> selected student{selectedIds.length > 1 ? "s" : ""}.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  placeholder="e.g. Action Required: Complete your checkout"
                  className="w-full bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Message</label>
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full h-32 bg-surface ring-1 ring-ink/10 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-ink/5">
                <button
                  onClick={() => setIsMessaging(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-surface ring-1 ring-border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const loadingToast = toast.loading(`Sending emails to ${selectedIds.length} students...`);
                    try {
                      const recipients = rows
                        .filter(r => selectedIds.includes(r.id))
                        .map(r => ({ email: r.email, name: r.name }));

                      const res = await sendBulkEmailFn({
                        data: {
                          recipients,
                          senderName: user?.user_metadata?.full_name || "Admin",
                          senderRole: role === "admin" ? "Admin" : "Instructor",
                          subject: msgSubject,
                          message: msgBody
                        }
                      });

                      if (res.ok) {
                        toast.success(`Successfully sent emails!`, { id: loadingToast });
                        setIsMessaging(false);
                        setMsgSubject("");
                        setMsgBody("");
                        setSelectedIds([]);
                      } else {
                        toast.error(res.error || "Failed to send to some or all", { id: loadingToast });
                      }
                    } catch (err) {
                      toast.error("An error occurred while sending.", { id: loadingToast });
                    }
                  }}
                  disabled={!msgSubject.trim() || !msgBody.trim()}
                  className="px-4 py-2 text-sm font-medium bg-brand text-brand-foreground rounded-xl disabled:opacity-50"
                >
                  Send Emails
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isWhatsappModal && whatsappQueue[whatsappQueueIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setIsWhatsappModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card ring-1 ring-border rounded-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-ink"
          >
            <div className="flex items-center justify-between border-b border-ink/5 pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-ink">
                <WhatsappIcon className="size-5 text-emerald-500" /> WhatsApp Outreach
              </h2>
              {whatsappQueue.length > 1 && (
                <span className="text-xs bg-brand/15 text-brand-text px-2 py-0.5 rounded font-mono font-bold">
                  {whatsappQueueIndex + 1} / {whatsappQueue.length}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Recipient info panel */}
              <div className="p-3 bg-surface rounded-xl text-xs space-y-1 ring-1 ring-ink/5">
                <div>Recipient Name: <strong className="text-ink font-semibold">{whatsappQueue[whatsappQueueIndex].name}</strong></div>
                <div>Phone/WhatsApp: <strong className="text-ink font-mono font-semibold">{whatsappQueue[whatsappQueueIndex].phone}</strong></div>
                <div>Email: <strong className="text-ink/65">{whatsappQueue[whatsappQueueIndex].email}</strong></div>
              </div>

              {/* Group invite link input */}
              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">WhatsApp Group/Community Invite Link</label>
                <input
                  type="text"
                  value={whatsappGroupLink}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWhatsappGroupLink(val);
                    localStorage.setItem("okike_whatsapp_group_link", val);
                  }}
                  placeholder="e.g. https://chat.whatsapp.com/Gabc123xyz"
                  className="w-full bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand font-mono text-ink"
                />
              </div>

              {/* Template text area */}
              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">Message Preview (Editable)</label>
                <textarea
                  value={whatsappCustomMsg}
                  onChange={(e) => setWhatsappCustomMsg(e.target.value)}
                  placeholder="Draft your reminder..."
                  className="w-full h-36 bg-surface ring-1 ring-ink/10 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand text-ink"
                />
              </div>

              <div className="flex justify-between items-center gap-2 mt-4 pt-4 border-t border-ink/5">
                <div>
                  {whatsappQueue.length > 1 && whatsappQueueIndex > 0 && (
                    <button
                      onClick={() => setWhatsappQueueIndex(prev => prev - 1)}
                      className="px-3 py-1.5 text-xs font-semibold uppercase hover:bg-surface ring-1 ring-border rounded-xl text-ink"
                    >
                      Prev
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsWhatsappModal(false)}
                    className="px-4 py-2 text-sm font-medium hover:bg-surface ring-1 ring-border rounded-xl text-ink"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const current = whatsappQueue[whatsappQueueIndex];
                      if (!current.phone) {
                        toast.error("This student registration does not have a phone number.");
                        return;
                      }
                      
                      const formattedPhone = formatWhatsAppPhone(current.phone);
                      const encodedText = encodeURIComponent(whatsappCustomMsg);
                      const url = `https://wa.me/${formattedPhone}?text=${encodedText}`;
                      window.open(url, "_blank");

                      // Auto advance on click if bulk queue
                      if (whatsappQueueIndex < whatsappQueue.length - 1) {
                        setTimeout(() => {
                          setWhatsappQueueIndex(prev => prev + 1);
                        }, 600);
                      } else {
                        toast.success("Outreach session complete!");
                        setIsWhatsappModal(false);
                        setSelectedIds([]);
                      }
                    }}
                    disabled={!whatsappGroupLink.trim() || !whatsappCustomMsg.trim()}
                    className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    Open Chat {whatsappQueue.length > 1 && whatsappQueueIndex < whatsappQueue.length - 1 ? "& Next" : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-ink/10">
      <div className="text-xs uppercase tracking-wider text-ink/50 font-medium">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1.5 font-mono">{value}</div>
    </div>
  );
}

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.015-5.08-2.859-6.927C16.378 2.032 13.911 1.016 11.99 1.016c-5.407 0-9.813 4.398-9.817 9.8-.001 1.564.423 3.09 1.226 4.453l-1.014 3.702 3.805-.989zM16.5 13.5c-.27-.13-1.59-.785-1.84-.875-.25-.09-.43-.13-.61.13-.18.26-.71.875-.87 1.055-.16.18-.32.2-.59.07-2.3-1.12-3.66-2.58-4.22-3.55-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.61-1.475-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.47.07-.72.34-.25.27-.96.94-.96 2.29s.98 2.64 1.12 2.82c.14.18 1.93 2.94 4.67 4.12.65.28 1.16.45 1.56.57.66.21 1.25.18 1.72.11.52-.08 1.59-.65 1.81-1.27.22-.63.22-1.16.16-1.27-.06-.11-.22-.18-.49-.31z" />
  </svg>
);
