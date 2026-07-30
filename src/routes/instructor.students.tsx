import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, GraduationCap, Award, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { sendDirectMessage } from "@/lib/forms.functions";


export const Route = createFileRoute("/instructor/students")({
  component: InstructorStudentsPage,
});

const BACKUP_MILESTONES = [
  { id: "ms-1", title: "Git & Workspace Setup" },
  { id: "ms-2", title: "Module 1 Exam Passed" },
  { id: "ms-3", title: "Mid-term Project Submission" },
  { id: "ms-4", title: "Summit Capstone Approved" }
];

function InstructorStudentsPage() {
  const { user, role } = useAuth();
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgress, setSelectedProgress] = useState<any | null>(null);
  
  const [milestonesUpdate, setMilestonesUpdate] = useState<Record<string, string>>({});
  const [lessonsUpdate, setLessonsUpdate] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  
  // Email state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const sendEmailFn = useServerFn(sendDirectMessage);


  async function loadProgress() {
    try {
      const [{ data: sp }, { data: cs }, { data: regs }] = await Promise.all([
        (supabase as any).from("student_progress").select("*").order("updated_at", { ascending: false }),
        supabase.from("courses").select("id, title, track, lessons, milestones, instructor_user_id"),
        (supabase as any).from("bootcamp_registrations").select("email, course"),
      ]);

      const courses = cs ?? [];
      const studentRegs = regs ?? [];
      setCoursesList(courses);
      setRegistrations(studentRegs);

      let filteredProgress = sp ?? [];
      if (role === "instructor" && user?.id) {
        // Instructors only see students matching their courses
        const myCourses = courses.filter((c: any) => c.instructor_user_id === user.id);
        
        filteredProgress = (sp ?? []).filter((progressItem: any) => {
          const studentRegsForEmail = studentRegs.filter(
            (r: any) => r.email?.toLowerCase().trim() === progressItem.student_email?.toLowerCase().trim()
          );
          if (studentRegsForEmail.length === 0) return false;

          return studentRegsForEmail.some((studentReg: any) => {
            if (!studentReg?.course) return false;
            const regTrack = studentReg.course;

            return myCourses.some((c: any) => {
              const reg = regTrack.toLowerCase().trim();
              const title = (c.title || "").toLowerCase().trim();
              const track = (c.track || "").toLowerCase().trim();
              if (title === reg || track === reg) return true;
              if (reg.includes("cyber") && (title.includes("cyber") || track.includes("cyber"))) return true;
              if (
                (reg.includes("frontend") || reg.includes("backend") || reg.includes("web") || reg.includes("stack")) && 
                (title.includes("stack") || title.includes("web") || title.includes("frontend") || title.includes("backend") || track.includes("web"))
              ) return true;
              if (
                (reg.includes("design") || reg.includes("ui") || reg.includes("ux")) &&
                (title.includes("design") || title.includes("ui") || title.includes("ux") || track.includes("design") || track.includes("ui"))
              ) return true;
              if (reg.includes("mobile") && (title.includes("mobile") || track.includes("mobile"))) return true;
              if (reg.includes("python") && (title.includes("python") || track.includes("python"))) return true;
              return false;
            });
          });
        });
      }

      setProgressRows(filteredProgress);
    } catch (err) {
      console.error("Error loading student progress", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProgress();
  }, []);

  function getStudentCourses(email: string) {
    const studentRegs = registrations.filter(
      (r: any) => r.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );
    const regTracks = studentRegs.map(r => r.course).filter(Boolean);
    return coursesList.filter((c) => {
      return regTracks.some(regTrack => {
        const reg = regTrack.toLowerCase().trim();
        const title = (c.title || "").toLowerCase().trim();
        const track = (c.track || "").toLowerCase().trim();
        if (title === reg || track === reg) return true;
        if (reg.includes("cyber") && (title.includes("cyber") || track.includes("cyber"))) return true;
        if (
          (reg.includes("frontend") || reg.includes("backend") || reg.includes("web") || reg.includes("stack")) && 
          (title.includes("stack") || title.includes("web") || title.includes("frontend") || title.includes("backend") || track.includes("web"))
        ) return true;
        if (
          (reg.includes("design") || reg.includes("ui") || reg.includes("ux")) &&
          (title.includes("design") || title.includes("ui") || title.includes("ux") || track.includes("design") || track.includes("ui"))
        ) return true;
        if (reg.includes("mobile") && (title.includes("mobile") || track.includes("mobile"))) return true;
        if (reg.includes("python") && (title.includes("python") || track.includes("python"))) return true;
        return false;
      });
    });
  }

  async function saveMilestones() {
    if (!selectedProgress) return;
    setBusy(true);

    const { error } = await (supabase as any)
      .from("student_progress")
      .update({
        milestone_status: milestonesUpdate,
        lessons_completed: lessonsUpdate,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedProgress.id);

    setBusy(false);
    if (!error) {
      toast.success("Student records updated successfully!");
      setSelectedProgress(null);
      loadProgress();
    } else {
      toast.error("Could not save records. Please try again.");
    }
  }

  async function handleSendEmail() {
    if (!selectedProgress || !emailSubject.trim() || !emailMessage.trim()) return;
    setIsSendingEmail(true);
    
    try {
      const res = await sendEmailFn({
        data: {
          studentEmail: selectedProgress.student_email,
          studentName: selectedProgress.student_email.split("@")[0], // Fallback name
          senderName: user?.user_metadata?.full_name || "OKIKE Instructor",
          senderRole: role === "admin" ? "Admin" : "Instructor",
          subject: emailSubject,
          message: emailMessage,
        }
      });
      
      if (res.ok) {
        toast.success("Message sent to student successfully!");
        setEmailSubject("");
        setEmailMessage("");
      } else {
        toast.error(res.error || "Failed to send message.");
      }
    } catch (err: any) {
      toast.error("An error occurred while sending the message.");
    } finally {
      setIsSendingEmail(false);
    }
  }

  const filteredRows = progressRows.filter(p => 
    p.student_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-2 text-ink">
          <Users className="size-6 text-brand" /> Student Academic Manager
        </h1>
        <p className="text-sm text-ink/65 mt-1">Review student curricula completions, grading assessments, and verify roadmaps.</p>
      </div>

      {/* Search and control filter */}
      <div className="flex items-center gap-2 max-w-md bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2">
        <Search className="size-4 text-ink/40 shrink-0" />
        <input
          type="text"
          placeholder="Search students by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm text-ink focus:outline-none w-full"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink/40 text-sm">Loading student progress files...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Progress List Table */}
          <div className="lg:col-span-7 bg-card rounded-2xl ring-1 ring-ink/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ink/10 bg-surface text-ink/60 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Student Email</th>
                    <th className="px-6 py-4">Lessons Complete</th>
                    <th className="px-6 py-4">Quiz Grades</th>
                    <th className="px-6 py-4">Milestones</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-ink/40">
                        No matching student records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((p) => {
                      const completedCount = p.lessons_completed?.length || 0;
                      const scores = p.quiz_scores || {};
                      const milestones = p.milestone_status || {};
                      
                      const courses = getStudentCourses(p.student_email);
                      const courseMilestones = courses.length > 0 ? courses.flatMap((c: any) => c.milestones || []) : BACKUP_MILESTONES;
                      const completedMilestones = Object.keys(milestones).filter(k => 
                        courseMilestones.some((m: any) => m.id === k) && milestones[k] === "completed"
                      ).length;
                      
                      return (
                        <tr key={p.id} className="hover:bg-ink/5 transition text-xs">
                          <td className="px-6 py-4 font-semibold text-ink">
                            {p.student_email}
                            {courses.length > 0 && (
                              <div className="text-[10px] text-brand font-normal mt-0.5">
                                {courses.map((c: any) => c.title).join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono">{completedCount} modules complete</td>
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
                            <span className="font-mono">{completedMilestones}/{courseMilestones.length} approved</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedProgress(p);
                                setMilestonesUpdate(p.milestone_status || {});
                                setLessonsUpdate(p.lessons_completed || []);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground font-semibold hover:opacity-90"
                            >
                              Manage Record
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

          {/* Edit milestones & modules sidebar */}
          {selectedProgress ? (
            <div className="lg:col-span-5 bg-card rounded-2xl ring-1 ring-ink/10 p-6 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-ink">Manage Student Progress</h3>
                <p className="text-xs text-ink/50 mt-0.5 truncate">{selectedProgress.student_email}</p>
              </div>

              <div className="flex flex-col gap-4 border-t border-ink/5 pt-4">
                {/* Modules completed checkbox */}
                {(() => {
                  const courses = getStudentCourses(selectedProgress.student_email);
                  const courseLessons = courses.flatMap((c) => (c.lessons as string[]) || []);

                  return (
                    <div className="flex flex-col gap-2 p-3 bg-surface rounded-xl">
                      <div className="text-xs font-semibold text-ink flex items-center gap-1">
                        <CheckCircle className="size-4 text-brand" /> Course Modules Completion
                      </div>
                      {courseLessons.length > 0 ? (
                        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                          {courseLessons.map((lesson) => {
                            const isDone = lessonsUpdate.includes(lesson);
                            return (
                              <label key={lesson} className="flex items-start gap-2.5 text-xs cursor-pointer text-ink/80 hover:text-ink select-none">
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => {
                                    setLessonsUpdate(prev =>
                                      isDone ? prev.filter(x => x !== lesson) : [...prev, lesson]
                                    );
                                  }}
                                  className="mt-0.5 size-4 rounded border-ink/20 text-brand focus:ring-brand"
                                />
                                <span>{lesson}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-ink/40 italic pl-1">No course track syllabus linked.</div>
                      )}
                    </div>
                  );
                })()}

                {/* Milestones status updates */}
                {(() => {
                  const courses = getStudentCourses(selectedProgress.student_email);
                  const courseMilestones = courses.length > 0 ? courses.flatMap((c: any) => c.milestones || []) : BACKUP_MILESTONES;

                  return (
                    <div className="flex flex-col gap-2.5">
                      <div className="text-xs font-semibold text-ink flex items-center gap-1">
                        <Award className="size-4 text-brand" /> Syllabus Milestones
                      </div>
                      {courseMilestones.length > 0 ? (
                        courseMilestones.map((m: any) => {
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
                        })
                      ) : (
                        <div className="text-[11px] text-ink/40 italic pl-1">No milestones defined.</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveMilestones}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50"
                >
                  Save Updates
                </button>
                <button
                  onClick={() => setSelectedProgress(null)}
                  className="px-4 py-2.5 rounded-xl bg-surface ring-1 ring-ink/10 text-xs font-semibold uppercase tracking-wider hover:bg-ink/5"
                >
                  Close
                </button>
              </div>

              {/* Direct Message Section */}
              <div className="mt-4 pt-4 border-t border-ink/5 flex flex-col gap-3">
                <div className="text-xs font-semibold text-ink flex items-center gap-1">
                  Send Direct Message
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-brand"
                />
                <textarea
                  placeholder="Type your message here..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-brand resize-none"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !emailSubject.trim() || !emailMessage.trim()}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink text-surface font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50"
                >
                  {isSendingEmail ? "Sending..." : "Send Message via Email"}
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-5 bg-surface rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/50 text-xs uppercase tracking-wider">
              Select a student to edit milestones & course module completions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
