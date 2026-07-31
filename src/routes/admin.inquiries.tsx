import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setInquiryStatus, convertInquiryToProject } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/inquiries")({
  component: InquiriesPage,
});

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  project_type: string;
  budget: string | null;
  timeline: string | null;
  details: string;
  status: string;
  created_at: string;
  client_user_id: string | null;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function InquiriesPage() {
  const [list, setList] = useState<Inquiry[]>([]);
  const [open, setOpen] = useState<Inquiry | null>(null);
  const setStatus = useServerFn(setInquiryStatus);
  const convert = useServerFn(convertInquiryToProject);

  async function load() {
    const { data } = await supabase
      .from("project_inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    setList((data ?? []) as Inquiry[]);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-medium">Inquiries</h1>
      <div className="bg-card rounded-2xl ring-1 ring-ink/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-ink/40">
            <tr>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Budget</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {list.map((i) => (
              <tr key={i.id} className="hover:bg-surface/60">
                <td className="px-4 py-3">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-ink/40">{i.email}</div>
                </td>
                <td className="px-4 py-3">{i.project_type}</td>
                <td className="px-4 py-3 text-xs">{i.budget || "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 capitalize">
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{new Date(i.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setOpen(i)} className="text-brand text-sm font-medium">
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink/40">
                  No inquiries
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
            className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-medium">{open.name}</h2>
                <p className="text-sm text-ink/60">
                  {open.email}
                  {open.phone && ` · ${open.phone}`}
                  {open.company && ` · ${open.company}`}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className="text-ink/40 text-2xl leading-none">
                ×
              </button>
            </div>
            <div className="text-sm space-y-2">
              <div>
                <b>Type:</b> {open.project_type}
              </div>
              <div>
                <b>Budget:</b> {open.budget || "—"}
              </div>
              <div>
                <b>Timeline:</b> {open.timeline || "—"}
              </div>
              <div>
                <b>Has account:</b>{" "}
                {open.client_user_id ? "Yes" : "No (will match by email when they sign up)"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-ink/40 mb-1">Details</div>
              <pre className="text-xs bg-card p-3 rounded-xl whitespace-pre-wrap font-sans">
                {open.details}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-ink/5">
              <button
                onClick={async () => {
                  try {
                    await setStatus({ data: { id: open.id, status: "reviewing" } });
                    toast.success("Marked as reviewing");
                    await load();
                    setOpen(null);
                  } catch (e: unknown) {
                    toast.error(errorMessage(e));
                  }
                }}
                className="px-4 py-2 rounded-full text-sm bg-amber-100 text-amber-900"
              >
                Mark reviewing
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Decline this inquiry?")) return;
                  try {
                    await setStatus({ data: { id: open.id, status: "declined" } });
                    toast.success("Declined");
                    await load();
                    setOpen(null);
                  } catch (e: unknown) {
                    toast.error(errorMessage(e));
                  }
                }}
                className="px-4 py-2 rounded-full text-sm bg-red-100 text-red-900"
              >
                Decline
              </button>
              <button
                onClick={async () => {
                  const title = prompt("Project title:", open.project_type);
                  if (!title) return;
                  try {
                    await convert({ data: { inquiryId: open.id, title } });
                    toast.success("Converted to project");
                    await load();
                    setOpen(null);
                  } catch (e: unknown) {
                    toast.error(errorMessage(e));
                  }
                }}
                className="px-4 py-2 rounded-full text-sm bg-brand text-brand-foreground ml-auto"
              >
                Accept & convert to project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
