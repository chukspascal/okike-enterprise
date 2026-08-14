import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cmsUpsert, cmsDelete, publishAIBlogPost } from "@/lib/admin.functions";
import { ImageUpload } from "@/components/ui/image-upload";

export const Route = createFileRoute("/admin/content/$type")({
  component: ContentPage,
});

type CmsTable =
  | "services"
  | "packages"
  | "addons"
  | "portfolio_items"
  | "partners"
  | "team_members"
  | "site_settings"
  | "blog_posts"
  | "courses"
  | "tracks"
  | "physical_classes"
  | "events";
type ContentValue = string | number | boolean | string[] | null | undefined;
type ContentRow = Record<string, ContentValue> & {
  id?: string;
  name?: string;
  title?: string;
  slug?: string;
  position?: number | null;
  published?: boolean | null;
};
type DynamicSelectBuilder = {
  select(columns: string): {
    order(column: string, options?: { ascending: boolean }): Promise<{ data: ContentRow[] | null }>;
  };
};
type DynamicSupabase = {
  from(table: string): DynamicSelectBuilder;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function inputValue(value: ContentValue) {
  if (value == null || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

function tagsValue(value: ContentValue) {
  if (Array.isArray(value)) return value.join(", ");
  return inputValue(value);
}

const TABLE_MAP: Record<
  string,
  {
    table: CmsTable;
    title: string;
    fields: {
      key: string;
      label: string;
      type?: "text" | "textarea" | "number" | "boolean" | "json" | "tags" | "image";
    }[];
    columns?: {
      key: string;
      label: string;
      render?: (row: ContentRow) => React.ReactNode;
    }[];
  }
> = {
  packages: {
    table: "packages",
    title: "Packages",
    fields: [
      { key: "slug", label: "Slug" },
      { key: "name", label: "Name" },
      { key: "tagline", label: "Tagline" },
      { key: "price", label: "Price", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "features", label: "Features (one per line)", type: "json" },
      { key: "position", label: "Order", type: "number" },
      { key: "featured", label: "Featured", type: "boolean" },
      { key: "request_quote", label: "Request quote (no price)", type: "boolean" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "price", label: "Price" },
      { key: "featured", label: "Featured", render: (r) => (r.featured ? "✓" : "—") },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  services: {
    table: "services",
    title: "Services",
    fields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "icon", label: "Icon (lucide name)" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "title", label: "Title" },
      { key: "icon", label: "Icon" },
      { key: "description", label: "Description", render: (r) => (typeof r.description === "string" ? `${r.description.slice(0, 50)}...` : "—") },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  addons: {
    table: "addons",
    title: "Add-ons",
    fields: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "price", label: "Price", type: "number" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "price", label: "Price" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  portfolio: {
    table: "portfolio_items",
    title: "Portfolio",
    fields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Featured Image", type: "image" },
      { key: "url", label: "Project URL" },
      { key: "tags", label: "Tags (comma-separated)", type: "tags" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      {
        key: "image_url",
        label: "Image",
        render: (r) => r.image_url ? <img src={r.image_url as string} alt="" className="size-12 object-cover rounded-lg" /> : "—"
      },
      { key: "title", label: "Title" },
      { key: "tags", label: "Tags", render: (r) => Array.isArray(r.tags) ? r.tags.slice(0, 3).map((t) => <span key={t} className="text-xs bg-ink/5 px-2 py-1 rounded mr-1">{t}</span>) : "—" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  partners: {
    table: "partners",
    title: "Partners",
    fields: [
      { key: "name", label: "Name" },
      { key: "logo_url", label: "Logo", type: "image" },
      { key: "url", label: "Website" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "logo_url", label: "Logo", render: (r) => r.logo_url ? <img src={r.logo_url as string} alt="" className="size-12 object-contain rounded-lg" /> : "—" },
      { key: "name", label: "Name" },
      { key: "url", label: "Website" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  team_members: {
    table: "team_members",
    title: "Team",
    fields: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "image_url", label: "Photo", type: "image" },
      { key: "skills", label: "Skills (comma-separated)", type: "tags" },
      { key: "github", label: "GitHub URL" },
      { key: "linkedin", label: "LinkedIn URL" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "image_url", label: "Photo", render: (r) => r.image_url ? <img src={r.image_url as string} alt="" className="size-12 object-cover rounded-full" /> : "—" },
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  blog: {
    table: "blog_posts",
    title: "Blog Posts",
    fields: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "excerpt", label: "Excerpt", type: "textarea" },
      { key: "content", label: "Content", type: "textarea" },
      { key: "image_url", label: "Featured Image", type: "image" },
      { key: "author", label: "Author" },
      { key: "tags", label: "Tags (comma-separated)", type: "tags" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url as string} alt="" className="size-12 object-cover rounded-lg" /> : "—" },
      { key: "title", label: "Title" },
      { key: "author", label: "Author" },
      { key: "tags", label: "Tags", render: (r) => Array.isArray(r.tags) ? r.tags.slice(0, 3).map((t) => <span key={t} className="text-xs bg-ink/5 px-2 py-1 rounded mr-1">{t}</span>) : "—" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  courses: {
    table: "courses",
    title: "Courses",
    fields: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "track", label: "Track" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "duration", label: "Duration" },
      { key: "image_url", label: "Featured Image", type: "image" },
      { key: "instructor", label: "Instructor" },
      { key: "price", label: "Price", type: "number" },
      { key: "original_price", label: "Original Price", type: "number" },
      { key: "instructor_avatar_url", label: "Instructor Avatar", type: "image" },
      { key: "instructor_bio", label: "Instructor Bio", type: "textarea" },
      { key: "rating", label: "Rating", type: "number" },
      { key: "reviews_count", label: "Reviews Count", type: "number" },
      { key: "lessons_count", label: "Lessons Count", type: "number" },
      { key: "modules", label: "Modules (one per line)", type: "json" },
      { key: "lessons", label: "Lessons (one per line)", type: "json" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url as string} alt="" className="size-12 object-cover rounded-lg" /> : "—" },
      { key: "title", label: "Title" },
      { key: "track", label: "Track" },
      { key: "price", label: "Price" },
      { key: "instructor", label: "Instructor" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  tracks: {
    table: "tracks",
    title: "Learning Paths",
    fields: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "tagline", label: "Tagline" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "stack", label: "Stack (one per line)", type: "json" },
      { key: "courses_count", label: "Courses Count", type: "number" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "tagline", label: "Tagline" },
      { key: "courses_count", label: "Courses" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  "physical-classes": {
    table: "physical_classes",
    title: "Physical Classes",
    fields: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Featured Image", type: "image" },
      { key: "date", label: "Date" },
      { key: "location", label: "Location" },
      { key: "spots_available", label: "Spots Available", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url as string} alt="" className="size-12 object-cover rounded-lg" /> : "—" },
      { key: "title", label: "Title" },
      { key: "date", label: "Date" },
      { key: "location", label: "Location" },
      { key: "spots_available", label: "Spots Left" },
      { key: "price", label: "Price" },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
  events: {
    table: "events",
    title: "Events",
    fields: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Cover Image", type: "image" },
      { key: "event_type", label: "Type (e.g. Workshop, Talk, Bootcamp)" },
      { key: "date", label: "Start Date & Time (ISO)" },
      { key: "end_date", label: "End Date & Time (ISO, optional)" },
      { key: "venue", label: "Venue Name" },
      { key: "location", label: "Location / City" },
      { key: "registration_url", label: "Registration URL" },
      { key: "is_free", label: "Free event", type: "boolean" },
      { key: "price", label: "Price (if paid)", type: "number" },
      { key: "spots_available", label: "Spots Available", type: "number" },
      { key: "tags", label: "Tags (comma-separated)", type: "tags" },
      { key: "position", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    columns: [
      { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url as string} alt="" className="size-12 object-cover rounded-lg" /> : "—" },
      { key: "title", label: "Title" },
      { key: "event_type", label: "Type" },
      { key: "date", label: "Date" },
      { key: "location", label: "Location" },
      { key: "is_free", label: "Free", render: (r) => (r.is_free ? "Free" : `₦${r.price ?? "—"}`) },
      { key: "published", label: "Published", render: (r) => (r.published ? "✓" : "—") },
    ],
  },
};

function ContentPage() {
  const { type } = useParams({ from: "/admin/content/$type" });
  const cfg = TABLE_MAP[type as string];
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const upsert = useServerFn(cmsUpsert);
  const del = useServerFn(cmsDelete);
  const publishAIPost = useServerFn(publishAIBlogPost);
  const [publishBusy, setPublishBusy] = useState(false);
  const [lastAiPost, setLastAiPost] = useState<string | null>(null);

  async function load() {
    if (!cfg) return;
    const tableClient = supabase as unknown as DynamicSupabase;
    const { data } = await tableClient
      .from(cfg.table)
      .select("*")
      .order("position", { ascending: true });
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    if (type === "blog") {
      supabase
        .from("blog_posts")
        .select("created_at")
        .eq("author", "OKIKE AI")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: aiPost }) => {
          setLastAiPost(aiPost?.created_at ?? null);
        });
    }
  }, [type]);

  if (!cfg) return <div>Unknown content type.</div>;

  function startNew() {
    const blank: ContentRow = {};
    cfg.fields.forEach((f) => {
      if (f.type === "boolean") blank[f.key] = f.key === "published";
      else if (f.type === "number") blank[f.key] = 0;
      else if (f.type === "json") blank[f.key] = [];
      else if (f.type === "tags") blank[f.key] = [];
      else blank[f.key] = "";
    });
    setEditing(blank);
  }

  async function save() {
    try {
      const row = { ...editing };
      // strip empty id for inserts
      if (!row.id) delete row.id;
      // convert empty strings to null for timestamp/numeric fields to avoid DB type errors
      for (const key of Object.keys(row)) {
        if (row[key] === "") {
          row[key] = null;
        }
      }
      await upsert({ data: { table: cfg.table, row } });
      toast.success("Saved");
      setEditing(null);
      await load();
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await del({ data: { table: cfg.table, id } });
      toast.success("Deleted");
      await load();
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-medium">{cfg.title}</h1>
          {(type === "blog" || type === "blog_posts") && lastAiPost && (
            <p className="text-xs text-ink/50 mt-1">
              Last AI post: {new Date(lastAiPost).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(type === "blog" || type === "blog_posts") && (
            <button
              onClick={async () => {
                setPublishBusy(true);
                try {
                  const result = await publishAIPost();
                  if (result.ok) {
                    toast.success(`Published: "${result.title}" · /${result.slug}`);
                    // Reload the list
                    load();
                    // Refresh last AI post timestamp
                    const { data: aiPost } = await supabase
                      .from("blog_posts")
                      .select("created_at")
                      .eq("author", "OKIKE AI")
                      .order("created_at", { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    setLastAiPost(aiPost?.created_at ?? null);
                  } else {
                    toast.error(result.error);
                  }
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Failed to publish AI post");
                } finally {
                  setPublishBusy(false);
                }
              }}
              disabled={publishBusy}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition disabled:opacity-50"
            >
              {publishBusy ? (
                <><Loader2 className="size-3.5 animate-spin" /> Publishing…</>
              ) : (
                <><Sparkles className="size-3.5" /> Publish AI Post</>
              )}
            </button>
          )}
          <button
            onClick={startNew}
            className="px-4 py-2 rounded-full bg-brand text-brand-foreground text-sm font-medium"
          >
            + New
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl ring-1 ring-ink/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-ink/40">
            <tr>
              {cfg.columns?.map((col) => (
                <th key={col.key} className="text-left px-4 py-3">{col.label}</th>
              )) || (
                  <>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Order</th>
                    <th className="text-left px-4 py-3">Published</th>
                  </>
                )}
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {rows.map((r) => (
              <tr key={r.id}>
                {cfg.columns?.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(r) : (r[col.key] as string) ?? "—"}
                  </td>
                )) || (
                    <>
                      <td className="px-4 py-3 font-medium">{r.name || r.title || r.slug}</td>
                      <td className="px-4 py-3">{r.position ?? "—"}</td>
                      <td className="px-4 py-3">{r.published ? "✓" : "—"}</td>
                    </>
                  )}
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => setEditing(r)} className="text-brand text-sm">
                    Edit
                  </button>
                  <button onClick={() => r.id && remove(r.id)} className="text-red-600 text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={(cfg.columns?.length || 3) + 1} className="px-4 py-8 text-center text-ink/40">
                  Empty. Click "+ New".
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-medium">
              {editing.id ? "Edit" : "New"} {cfg.title}
            </h2>
            {cfg.fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase tracking-wider text-ink/40">{f.label}</span>
                {f.type === "image" ? (
                  <ImageUpload
                    value={editing[f.key] as string | null}
                    onChange={(url) => setEditing({ ...editing, [f.key]: url })}
                  />
                ) : f.type === "textarea" ? (
                  <textarea
                    rows={4}
                    value={inputValue(editing[f.key])}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2"
                  />
                ) : f.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={!!editing[f.key]}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                    className="size-5"
                  />
                ) : f.type === "number" ? (
                  <input
                    type="number"
                    value={inputValue(editing[f.key])}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [f.key]: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2"
                  />
                ) : f.type === "json" ? (
                  <textarea
                    rows={5}
                    value={inputValue(editing[f.key])}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [f.key]: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm"
                  />
                ) : f.type === "tags" ? (
                  <input
                    value={tagsValue(editing[f.key])}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [f.key]: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2"
                  />
                ) : (
                  <input
                    value={inputValue(editing[f.key])}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="bg-card ring-1 ring-ink/10 rounded-xl px-3 py-2"
                  />
                )}
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full text-sm">
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 rounded-full bg-brand text-brand-foreground text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
