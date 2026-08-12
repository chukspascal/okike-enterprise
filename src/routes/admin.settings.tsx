import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cmsUpsert } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/settings")({
  component: SiteSettingsPage,
});

const KEYS: {
  key: string;
  label: string;
  fields: { name: string; label: string; type?: "text" | "textarea" }[];
}[] = [
  {
    key: "hero",
    label: "Homepage hero",
    fields: [
      { name: "title", label: "Title", type: "textarea" },
      { name: "subtitle", label: "Subtitle", type: "textarea" },
      { name: "cta_label", label: "CTA label" },
      { name: "cta_link", label: "CTA link" },
    ],
  },
  {
    key: "about",
    label: "About section",
    fields: [
      { name: "title", label: "Title" },
      { name: "body", label: "Body", type: "textarea" },
    ],
  },
  {
    key: "about_founder_story",
    label: "About Page: Founder Story",
    fields: [
      { name: "founder_name", label: "Founder Name" },
      { name: "founder_title", label: "Founder Title" },
      { name: "founder_quote", label: "Founder Highlight Quote (Inside Box)", type: "textarea" },
      { name: "founder_letter_p1", label: "Letter Paragraph 1", type: "textarea" },
      { name: "founder_letter_p2", label: "Letter Paragraph 2", type: "textarea" },
      { name: "founder_letter_p3", label: "Letter Paragraph 3", type: "textarea" },
    ],
  },
  {
    key: "about_timeline",
    label: "About Page: Timeline (JSON)",
    fields: [
      { 
        name: "milestones_json", 
        label: 'Milestones (List of {"year": "...", "title": "...", "desc": "..."})', 
        type: "textarea" 
      },
    ],
  },
  {
    key: "contact",
    label: "Contact info",
    fields: [
      { name: "email", label: "Email" },
      { name: "phone", label: "Phone" },
      { name: "address", label: "Address" },
    ],
  },
];

type SettingValue = Record<string, string>;
type SettingsMap = Record<string, SettingValue>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function SiteSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const upsert = useServerFn(cmsUpsert);

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [newDept, setNewDept] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [loadingDb, setLoadingDb] = useState(true);

  async function load() {
    const { data } = await supabase.from("site_settings").select("*");
    const m: SettingsMap = {};
    (data ?? []).forEach((r) => {
      if (r.value && typeof r.value === "object" && !Array.isArray(r.value)) {
        m[r.key] = r.value as SettingValue;
      }
    });
    setSettings(m);
  }

  async function loadDbData() {
    setLoadingDb(true);
    try {
      const [{ data: depts }, { data: crs }] = await Promise.all([
        (supabase as any).from("aksu_departments").select("*").order("name"),
        (supabase as any).from("bootcamp_courses").select("*").order("name"),
      ]);
      setDepartments((depts as any) || []);
      setCourses((crs as any) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDb(false);
    }
  }

  useEffect(() => {
    load();
    loadDbData();
  }, []);

  async function saveKey(key: string) {
    try {
      await upsert({ data: { table: "site_settings", row: { key, value: settings[key] ?? {} } } });
      toast.success("Saved");
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    }
  }

  async function handleAddDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newDept.trim()) return;
    const name = newDept.trim();
    const { error } = await (supabase as any).from("aksu_departments").insert({ name });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Department added");
      setNewDept("");
      loadDbData();
    }
  }

  async function handleDeleteDept(id: string) {
    if (!confirm("Are you sure you want to delete this department?")) return;
    const { error } = await (supabase as any).from("aksu_departments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Department deleted");
      loadDbData();
    }
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newCourse.trim()) return;
    const name = newCourse.trim();
    const { error } = await (supabase as any).from("bootcamp_courses").insert({ name });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Course added");
      setNewCourse("");
      loadDbData();
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm("Are you sure you want to delete this course track?")) return;
    const { error } = await (supabase as any).from("bootcamp_courses").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Course track deleted");
      loadDbData();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-medium">Site settings</h1>
      {KEYS.map((g) => (
        <section
          key={g.key}
          className="bg-card rounded-2xl p-6 ring-1 ring-ink/5 flex flex-col gap-3"
        >
          <div className="flex justify-between items-center">
            <h2 className="font-medium">{g.label}</h2>
            <button
              onClick={() => saveKey(g.key)}
              className="px-4 py-2 rounded-full bg-brand text-brand-foreground text-sm font-medium"
            >
              Save
            </button>
          </div>
          {g.fields.map((f) => (
            <label key={f.name} className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-wider text-ink/40">{f.label}</span>
              {f.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={settings[g.key]?.[f.name] ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [g.key]: { ...(settings[g.key] ?? {}), [f.name]: e.target.value },
                    })
                  }
                  className="bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2"
                />
              ) : (
                <input
                  value={settings[g.key]?.[f.name] ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [g.key]: { ...(settings[g.key] ?? {}), [f.name]: e.target.value },
                    })
                  }
                  className="bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2"
                />
              )}
            </label>
          ))}
        </section>
      ))}

      {/* AKSU Departments Management */}
      <section className="bg-card rounded-2xl p-6 ring-1 ring-ink/5 flex flex-col gap-4">
        <h2 className="font-medium text-lg">AKSU Departments</h2>
        <p className="text-xs text-ink/50 -mt-2">Add or remove departments available for Synergy Summit registration.</p>
        
        <form onSubmit={handleAddDept} className="flex gap-2">
          <input
            type="text"
            placeholder="New Department Name"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            className="flex-1 bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium"
          >
            Add
          </button>
        </form>

        {loadingDb ? (
          <div className="text-xs text-ink/40">Loading departments...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface ring-1 ring-ink/10 text-xs font-medium text-ink"
              >
                {d.name}
                <button
                  type="button"
                  onClick={() => handleDeleteDept(d.id)}
                  className="text-red-500 hover:text-red-700 font-bold ml-1"
                  title="Delete"
                >
                  &times;
                </button>
              </span>
            ))}
            {departments.length === 0 && (
              <div className="text-xs text-ink/40">No departments added yet.</div>
            )}
          </div>
        )}
      </section>

      {/* Bootcamp Courses Management */}
      <section className="bg-card rounded-2xl p-6 ring-1 ring-ink/5 flex flex-col gap-4">
        <h2 className="font-medium text-lg">Summit Courses / Tracks</h2>
        <p className="text-xs text-ink/50 -mt-2">Add or remove course tracks available for students to select.</p>
        
        <form onSubmit={handleAddCourse} className="flex gap-2">
          <input
            type="text"
            placeholder="New Course Track Name"
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
            className="flex-1 bg-surface ring-1 ring-ink/10 rounded-xl px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium"
          >
            Add
          </button>
        </form>

        {loadingDb ? (
          <div className="text-xs text-ink/40">Loading courses...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface ring-1 ring-ink/10 text-xs font-medium text-ink"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => handleDeleteCourse(c.id)}
                  className="text-red-500 hover:text-red-700 font-bold ml-1"
                  title="Delete"
                >
                  &times;
                </button>
              </span>
            ))}
            {courses.length === 0 && (
              <div className="text-xs text-ink/40">No course tracks added yet.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
