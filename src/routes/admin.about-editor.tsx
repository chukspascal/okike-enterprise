import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cmsUpsert } from "@/lib/admin.functions";
import { 
  FileText, 
  Milestone as MilestoneIcon, 
  Users, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  Loader2,
  BookOpen
} from "lucide-react";

export const Route = createFileRoute("/admin/about-editor")({
  component: AboutEditorPage,
});

type FounderStory = {
  founder_name: string;
  founder_title: string;
  founder_quote: string;
  founder_letter_p1: string;
  founder_letter_p2: string;
  founder_letter_p3: string;
};

type Milestone = {
  year: string;
  title: string;
  desc: string;
};

function AboutEditorPage() {
  const upsert = useServerFn(cmsUpsert);
  const [activeTab, setActiveTab] = useState<"story" | "timeline" | "team">("story");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States
  const [founderStory, setFounderStory] = useState<FounderStory>({
    founder_name: "Anas & Team",
    founder_title: "Founder & Lead Builder",
    founder_quote: "",
    founder_letter_p1: "",
    founder_letter_p2: "",
    founder_letter_p3: "",
  });

  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Load Settings
  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["about_founder_story", "about_timeline"]);

      if (data) {
        const settingsMap: Record<string, any> = {};
        data.forEach((row) => {
          settingsMap[row.key] = row.value;
        });

        if (settingsMap["about_founder_story"]) {
          setFounderStory({
            founder_name: settingsMap["about_founder_story"].founder_name || "",
            founder_title: settingsMap["about_founder_story"].founder_title || "",
            founder_quote: settingsMap["about_founder_story"].founder_quote || "",
            founder_letter_p1: settingsMap["about_founder_story"].founder_letter_p1 || "",
            founder_letter_p2: settingsMap["about_founder_story"].founder_letter_p2 || "",
            founder_letter_p3: settingsMap["about_founder_story"].founder_letter_p3 || "",
          });
        }

        if (settingsMap["about_timeline"] && settingsMap["about_timeline"].milestones_json) {
          try {
            const parsed = JSON.parse(settingsMap["about_timeline"].milestones_json);
            if (Array.isArray(parsed)) {
              setMilestones(parsed);
            }
          } catch (e) {
            console.error("Timeline parsing error", e);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Save Settings
  async function handleSave() {
    setSaving(true);
    try {
      // Save Founder Story
      await upsert({
        data: {
          table: "site_settings",
          row: {
            key: "about_founder_story",
            value: founderStory,
          },
        },
      });

      // Save Timeline Milestones
      await upsert({
        data: {
          table: "site_settings",
          row: {
            key: "about_timeline",
            value: {
              milestones_json: JSON.stringify(milestones),
            },
          },
        },
      });

      toast.success("About page contents updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save updates");
    } finally {
      setSaving(false);
    }
  }

  // Milestones Helpers
  const addMilestone = () => {
    setMilestones([...milestones, { year: "", title: "", desc: "" }]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const updateMilestone = (idx: number, field: keyof Milestone, val: string) => {
    const next = [...milestones];
    next[idx] = { ...next[idx], [field]: val };
    setMilestones(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      {/* Title & Save Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-ink/10">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink">
            About Page CMS
          </h1>
          <p className="text-xs text-ink/50 mt-1">
            Manage founder bio details, history timelines, and quick links to core team profiles.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-brand-foreground px-5 py-3 font-semibold text-xs uppercase tracking-widest hover:opacity-95 disabled:opacity-50 transition flex items-center gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/10">
        <button
          onClick={() => setActiveTab("story")}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === "story" 
              ? "border-brand text-brand" 
              : "border-transparent text-ink/40 hover:text-ink"
          }`}
        >
          <FileText className="size-4" /> Founder & Letter
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === "timeline" 
              ? "border-brand text-brand" 
              : "border-transparent text-ink/40 hover:text-ink"
          }`}
        >
          <MilestoneIcon className="size-4" /> Journey Timeline
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === "team" 
              ? "border-brand text-brand" 
              : "border-transparent text-ink/40 hover:text-ink"
          }`}
        >
          <Users className="size-4" /> Team Profiles
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-card border border-ink/10 p-6 md:p-8">
        
        {/* Panel 1: Story & Bio */}
        {activeTab === "story" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  Founder Name
                </label>
                <input
                  type="text"
                  value={founderStory.founder_name}
                  onChange={(e) => setFounderStory({ ...founderStory, founder_name: e.target.value })}
                  placeholder="e.g. Anas"
                  className="w-full bg-surface border border-ink/15 px-4 py-3 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  Founder Title / Role
                </label>
                <input
                  type="text"
                  value={founderStory.founder_title}
                  onChange={(e) => setFounderStory({ ...founderStory, founder_title: e.target.value })}
                  placeholder="e.g. Founder & Lead Architect"
                  className="w-full bg-surface border border-ink/15 px-4 py-3 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                Founder Highlight Quote (Inside Quote Box)
              </label>
              <textarea
                rows={3}
                value={founderStory.founder_quote}
                onChange={(e) => setFounderStory({ ...founderStory, founder_quote: e.target.value })}
                placeholder="Write a notable quote..."
                className="w-full bg-surface border border-ink/15 px-4 py-3 text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="border-t border-ink/10 pt-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                Founder Letter Paragraphs
              </h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  Paragraph 1 (The starting paragraph - supports drop cap)
                </label>
                <textarea
                  rows={4}
                  value={founderStory.founder_letter_p1}
                  onChange={(e) => setFounderStory({ ...founderStory, founder_letter_p1: e.target.value })}
                  className="w-full bg-surface border border-ink/15 px-4 py-3 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  Paragraph 2
                </label>
                <textarea
                  rows={4}
                  value={founderStory.founder_letter_p2}
                  onChange={(e) => setFounderStory({ ...founderStory, founder_letter_p2: e.target.value })}
                  className="w-full bg-surface border border-ink/15 px-4 py-3 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  Paragraph 3 (Concluding summary)
                </label>
                <textarea
                  rows={4}
                  value={founderStory.founder_letter_p3}
                  onChange={(e) => setFounderStory({ ...founderStory, founder_letter_p3: e.target.value })}
                  className="w-full bg-surface border border-ink/15 px-4 py-3 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Journey Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-ink/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                Timeline Milestones List ({milestones.length})
              </span>
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand hover:opacity-80 transition"
              >
                <Plus className="size-3.5" /> Add Milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-ink/20 text-ink/50 text-xs">
                No milestones defined. Click "Add Milestone" to begin structuring your journey.
              </div>
            ) : (
              <div className="space-y-4">
                {milestones.map((item, idx) => (
                  <div key={idx} className="bg-surface border border-ink/10 p-4 flex gap-4 items-start relative group">
                    <button
                      type="button"
                      onClick={() => removeMilestone(idx)}
                      className="absolute top-4 right-4 p-1.5 text-ink/30 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"
                      aria-label="Delete milestone"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    <div className="w-20 space-y-1">
                      <label className="text-[8px] font-bold uppercase tracking-wider text-ink/40 block">
                        Year
                      </label>
                      <input
                        type="text"
                        value={item.year}
                        onChange={(e) => updateMilestone(idx, "year", e.target.value)}
                        placeholder="e.g. 2023"
                        className="w-full bg-card border border-ink/15 px-2 py-1 text-xs text-ink font-bold focus:outline-none focus:border-brand text-center"
                      />
                    </div>

                    <div className="flex-1 space-y-4 pr-8">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase tracking-wider text-ink/40 block">
                          Milestone Title
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                          placeholder="e.g. OKIKE Founded"
                          className="w-full bg-card border border-ink/15 px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase tracking-wider text-ink/40 block">
                          Milestone Description
                        </label>
                        <textarea
                          rows={2}
                          value={item.desc}
                          onChange={(e) => updateMilestone(idx, "desc", e.target.value)}
                          placeholder="Short narrative..."
                          className="w-full bg-card border border-ink/15 px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 3: Team Members Redirection */}
        {activeTab === "team" && (
          <div className="text-center py-12 max-w-lg mx-auto space-y-6">
            <div className="p-4 bg-brand/10 inline-block">
              <Users className="size-8 text-brand" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-lg font-bold text-ink uppercase tracking-wide">
                Team Member Profile CMS
              </h3>
              <p className="text-xs text-ink/65 leading-relaxed">
                Team members are managed within our main structured Database directory. You can add new members, upload photos, set custom order positions, and declare skills lists there.
              </p>
            </div>
            <Link
              to="/admin/content/$type"
              params={{ type: "team_members" }}
              className="inline-flex items-center gap-2 bg-brand text-brand-foreground px-6 py-3.5 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition shadow-md"
            >
              Go to Team Profiles CMS <ArrowUpRight className="size-4" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
