import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateProject, updateMilestone, postProjectUpdate, draftProjectUpdate, generateMilestonePlan } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/projects")({
  component: AdminProjects,
});

type Project = {
  id: string;
  client_email: string;
  title: string;
  package_name: string | null;
  total: number | null;
  deposit: number | null;
  stage: string;
  admin_notes: string | null;
  created_at: string;
  inquiry_id: string | null;
  currency: string;
};
type ProjectStage = Project["stage"];
type Milestone = {
  id: string;
  project_id: string;
  name: string;
  status: string;
  note: string | null;
  position: number;
};
type MilestoneStatus = Milestone["status"];
type Update = { id: string; project_id: string; message: string; created_at: string };

const STAGES = ["submitted", "reviewing", "accepted", "declined", "in_progress", "completed"];
const M_STATUS = ["pending", "active", "done"];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function AdminProjects() {
  const [list, setList] = useState<Project[]>([]);
  const [open, setOpen] = useState<Project | null>(null);
  const [ms, setMs] = useState<Milestone[]>([]);
  const [up, setUp] = useState<Update[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const updateProj = useServerFn(updateProject);
  const updateMs = useServerFn(updateMilestone);
  const postUp = useServerFn(postProjectUpdate);
  const draftUpdate = useServerFn(draftProjectUpdate);
  const genMilestones = useServerFn(generateMilestonePlan);
  const [aiDraftBusy, setAiDraftBusy] = useState(false);
  const [milestonePlan, setMilestonePlan] = useState<string[] | null>(null);
  const [milestonePlanBusy, setMilestonePlanBusy] = useState(false);
  const [inquiryDetails, setInquiryDetails] = useState<string>("");

  async function load() {
    const { data } = await supabase
      .from("client_projects")
      .select("id, title, client_email, package_name, total, deposit, stage, admin_notes, created_at, inquiry_id, currency")
      .order("created_at", { ascending: false });
    setList((data ?? []) as Project[]);
  }
  async function loadDetail(id: string) {
    const [{ data: m }, { data: u }] = await Promise.all([
      supabase.from("project_milestones").select("*").eq("project_id", id).order("position"),
      supabase
        .from("project_updates")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setMs((m ?? []) as Milestone[]);
    setUp((u ?? []) as Update[]);
  }

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (open) {
      loadDetail(open.id);
      // Fetch linked inquiry details for AI milestone generation
      if (open.inquiry_id) {
        supabase
          .from("project_inquiries")
          .select("details")
          .eq("id", open.inquiry_id)
          .maybeSingle()
          .then(({ data: inq }) => {
            setInquiryDetails(inq?.details ?? "");
          });
      } else {
        setInquiryDetails("");
      }
    }
  }, [open]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-medium">Projects</h1>
      <div className="bg-card rounded-2xl ring-1 ring-ink/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-ink/40">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Stage</th>
              <th className="text-left px-4 py-3">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-xs">{p.client_email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 capitalize">
                    {p.stage.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.total ? (p.currency === "NGN" ? `₦${Number(p.total).toLocaleString()}` : `$${Number(p.total).toLocaleString()}`) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setOpen(p)} className="text-brand text-sm font-medium">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/40">
                  No projects yet — accept an inquiry first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-surface rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-medium">{open.title}</h2>
                <p className="text-sm text-ink/60">{open.client_email}</p>
              </div>
              <button onClick={() => setOpen(null)} className="text-ink/40 text-2xl">
                ×
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase tracking-wider text-ink/40">Stage</span>
                <select
                  defaultValue={open.stage}
                  onChange={async (e) => {
                    try {
                      await updateProj({
                        data: { id: open.id, stage: e.target.value as ProjectStage },
                      });
                      toast.success("Stage updated");
                      await load();
                      await loadDetail(open.id);
                    } catch (err: unknown) {
                      toast.error(errorMessage(err));
                    }
                  }}
                  className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase tracking-wider text-ink/40">Total ({open.currency})</span>
                <input
                  type="number"
                  defaultValue={open.total ?? ""}
                  onBlur={async (e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    try {
                      await updateProj({ data: { id: open.id, total: v } });
                      toast.success("Saved");
                      await load();
                    } catch (err: unknown) {
                      toast.error(errorMessage(err));
                    }
                  }}
                  className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-wider text-ink/40">
                Notes for the client
              </span>
              <textarea
                defaultValue={open.admin_notes ?? ""}
                rows={3}
                onBlur={async (e) => {
                  try {
                    await updateProj({
                      data: { id: open.id, admin_notes: e.target.value || null },
                    });
                    toast.success("Notes saved");
                  } catch (err: unknown) {
                    toast.error(errorMessage(err));
                  }
                }}
                className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm"
              />
            </label>

            {ms.length === 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-ink/40 mb-2">Milestones</div>
                {milestonePlan ? (
                  <div className="flex flex-col gap-3">
                    <div className="text-sm font-medium text-ink/70">AI suggested milestones:</div>
                    <ol className="flex flex-col gap-1.5">
                      {milestonePlan.map((name, i) => (
                        <li key={i} className="text-sm flex items-center gap-2 bg-brand/5 rounded-lg px-3 py-2">
                          <span className="text-xs font-semibold text-brand">{i + 1}.</span>
                          <span>{name}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!open || !milestonePlan) return;
                          try {
                            for (let i = 0; i < milestonePlan.length; i++) {
                              const { error } = await supabase.from("project_milestones").insert({
                                project_id: open.id,
                                name: milestonePlan[i],
                                status: "pending",
                                position: i + 1,
                              });
                              if (error) throw new Error(error.message);
                            }
                            toast.success("Milestones created");
                            setMilestonePlan(null);
                            await loadDetail(open.id);
                          } catch (err: unknown) {
                            toast.error(errorMessage(err));
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setMilestonePlan(null)}
                        className="flex-1 py-2 rounded-xl bg-surface ring-1 ring-ink/10 text-sm font-medium"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      if (!open) return;
                      setMilestonePlanBusy(true);
                      try {
                        const result = await genMilestones({
                          data: {
                            projectTitle: open.title,
                            packageName: open.package_name,
                            stage: open.stage,
                            inquiryDetails: inquiryDetails || "No additional details provided.",
                          },
                        });
                        if (result.ok) {
                          setMilestonePlan(result.milestones);
                        } else {
                          toast.error("Couldn't generate a milestone plan. Check the inquiry details.");
                        }
                      } catch {
                        toast.error("Couldn't generate a milestone plan. Check the inquiry details.");
                      } finally {
                        setMilestonePlanBusy(false);
                      }
                    }}
                    disabled={milestonePlanBusy}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition disabled:opacity-50"
                  >
                    {milestonePlanBusy ? (
                      <><Loader2 className="size-3.5 animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles className="size-3.5" /> Generate Milestones with AI</>
                    )}
                  </button>
                )}
              </div>
            )}

            {ms.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-ink/40 mb-2">Milestones</div>
                <div className="flex flex-col gap-2">
                  {ms.map((m) => (
                    <div
                      key={m.id}
                      className="bg-card rounded-xl p-3 ring-1 ring-ink/5 flex flex-wrap items-center gap-3"
                    >
                      <div className="font-medium text-sm w-24">{m.name}</div>
                      <select
                        defaultValue={m.status}
                        onChange={async (e) => {
                          try {
                            await updateMs({
                              data: { id: m.id, status: e.target.value as MilestoneStatus },
                            });
                            toast.success("Saved");
                            await loadDetail(open.id);
                          } catch (err: unknown) {
                            toast.error(errorMessage(err));
                          }
                        }}
                        className="bg-surface ring-1 ring-ink/10 rounded-lg px-2 py-1 text-sm"
                      >
                        {M_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        defaultValue={m.note ?? ""}
                        placeholder="Note"
                        onBlur={async (e) => {
                          try {
                            await updateMs({ data: { id: m.id, note: e.target.value || null } });
                          } catch (err: unknown) {
                            toast.error(errorMessage(err));
                          }
                        }}
                        className="flex-1 bg-surface ring-1 ring-ink/10 rounded-lg px-3 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wider text-ink/40 mb-2">Post update</div>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="What should the client know?"
                  className="flex-1 min-w-0 bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={async () => {
                    if (!open) return;
                    setAiDraftBusy(true);
                    try {
                      const result = await draftUpdate({
                        data: {
                          projectTitle: open.title,
                          stage: open.stage,
                          packageName: open.package_name,
                          milestones: ms.map((m) => ({ name: m.name, status: m.status })),
                          recentUpdates: up.slice(0, 3).map((u) => u.message),
                        },
                      });
                      if (result.ok) {
                        setNewMsg(result.draft);
                      } else {
                        toast.error("AI draft failed. Try writing the update manually.");
                      }
                    } catch {
                      toast.error("AI draft failed. Try writing the update manually.");
                    } finally {
                      setAiDraftBusy(false);
                    }
                  }}
                  disabled={aiDraftBusy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition disabled:opacity-50 whitespace-nowrap"
                  title="Draft with AI"
                >
                  {aiDraftBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">{aiDraftBusy ? "" : "Draft with AI"}</span>
                </button>
                <button
                  onClick={async () => {
                    if (!newMsg.trim()) return;
                    try {
                      await postUp({ data: { project_id: open.id, message: newMsg } });
                      setNewMsg("");
                      toast.success("Posted");
                      await loadDetail(open.id);
                    } catch (err: unknown) {
                      toast.error(errorMessage(err));
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium whitespace-nowrap"
                >
                  Post
                </button>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {up.map((u) => (
                  <li key={u.id} className="bg-card rounded-lg p-3 text-sm">
                    <div className="text-xs text-ink/40">
                      {new Date(u.created_at).toLocaleString()}
                    </div>
                    <div>{u.message}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
