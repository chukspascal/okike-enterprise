import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { sendDirectMessage } from "@/lib/forms.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

type Msg = { id: string; name: string; email: string; message: string; created_at: string };

function AdminAnnouncements() {
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Msg | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  
  const { user, role } = useAuth();
  const sendEmailFn = useServerFn(sendDirectMessage);

  async function load() {
    const { data } = await supabase
      .from("contact_messages")
      .select("id, name, email, message, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Msg[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const c = supabase
      .channel("admin-contact")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(c);
    };
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (open?.id === id) setOpen(null);
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-2">
          <Megaphone className="size-6 text-brand" /> Messages
        </h1>
        <p className="text-sm text-ink/60 mt-1">Contact form submissions from the public site.</p>
      </div>

      <section className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-ink/40">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-ink/40">No messages yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((m) => (
              <li key={m.id} className="px-6 py-4 hover:bg-foreground/5 flex items-start gap-4">
                <div className="size-10 rounded-xl bg-brand/15 ring-1 ring-brand/25 grid place-items-center text-brand shrink-0">
                  <Mail className="size-4" />
                </div>
                <button onClick={() => setOpen(m)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium truncate">{m.name}</div>
                    <span className="text-xs text-ink/40 shrink-0">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-ink/60">{m.email}</div>
                  <div className="text-sm text-ink/80 mt-1 line-clamp-2">{m.message}</div>
                </button>
                <button
                  onClick={() => remove(m.id)}
                  className="text-ink/40 hover:text-rose-500 p-1.5 rounded"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card ring-1 ring-border rounded-2xl max-w-lg w-full p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{open.name}</div>
                <a href={`mailto:${open.email}`} className="text-xs text-brand hover:underline">
                  {open.email}
                </a>
              </div>
              <span className="text-xs text-ink/40">
                {new Date(open.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-ink/80 mt-4 whitespace-pre-wrap">{open.message}</p>
            
            {!replying ? (
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setReplying(true)}
                  className="rounded-xl bg-brand text-brand-foreground px-4 py-2 text-sm font-medium"
                >
                  Reply in System
                </button>
                <a
                  href={`mailto:${open.email}`}
                  className="rounded-xl bg-foreground/10 text-ink px-4 py-2 text-sm font-medium hover:bg-foreground/15 flex items-center justify-center"
                >
                  Reply via App
                </a>
                <button
                  onClick={() => setOpen(null)}
                  className="rounded-xl bg-foreground/5 ring-1 ring-border px-4 py-2 text-sm font-medium hover:bg-foreground/10"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Type your reply to ${open.name}...`}
                  className="w-full h-32 rounded-xl bg-surface ring-1 ring-border p-3 text-sm resize-none focus:ring-brand focus:outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setReplying(false); setReplyText(""); }}
                    className="px-4 py-2 text-sm font-medium hover:bg-surface ring-1 ring-border rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const loadingToast = toast.loading("Sending reply...");
                      try {
                        const res = await sendEmailFn({
                          data: {
                            studentEmail: open.email,
                            studentName: open.name,
                            senderName: user?.user_metadata?.full_name || "Admin",
                            senderRole: role === "admin" ? "Admin" : "Instructor",
                            subject: `Re: Your message to OKIKE`,
                            message: replyText,
                          }
                        });
                        if (res.ok) {
                          toast.success("Reply sent successfully!", { id: loadingToast });
                          setReplying(false);
                          setReplyText("");
                        } else {
                          toast.error(res.error || "Failed to send", { id: loadingToast });
                        }
                      } catch (err) {
                        toast.error("Failed to send reply", { id: loadingToast });
                      }
                    }}
                    disabled={!replyText.trim()}
                    className="px-4 py-2 text-sm font-medium bg-brand text-brand-foreground rounded-xl disabled:opacity-50"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
