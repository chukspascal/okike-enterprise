import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  triggerScraperAgent,
  updateScrapedIssue,
  deleteScrapedIssue,
  trainAgentMemory,
  type LogEntry
} from "@/lib/scraper.functions";
import { toast } from "sonner";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Globe,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  BookOpen,
  MapPin,
  Brain,
  Activity,
  Radio,
  SlidersHorizontal,
  Plus,
  X,
  Sparkles,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Trash2,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  Target,
  Maximize2,
  Compass,
  Radar
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/market-research")({
  head: () => ({ meta: [{ title: "Global Market Intelligence Platform — OKIKE" }] }),
  component: MarketIntelligencePlatform,
});

type ScrapedIssue = {
  id: string;
  title: string;
  description: string | null;
  source_url: string;
  source_platform: string;
  category: string | null;
  market_value_score: number;
  location_region: string;
  location_country: string;
  feedback_score: number;
  status: "new" | "reviewed" | "solved" | "ignored";
  solution_notes: string | null;
  created_at: string;
  updated_at: string;
};

type NeuralExemplar = {
  id: string;
  pattern_category: string;
  successful_blueprint_summary: string;
  confidence_weight: number;
  created_at: string;
};

// Geographic Coordinates and Zoom Levels for Digital Grid Navigation
const GEOGRAPHIC_ZONES = [
  { id: "all", name: "Global", country: "Global", sub: "Global Reconnaissance", center: [15, 20] as [number, number], zoom: 1.3 },
  { id: "na", name: "North America", country: "United States", sub: "USA & Canada", center: [-98, 39] as [number, number], zoom: 3.2 },
  { id: "eu", name: "Europe", country: "Germany", sub: "European Union", center: [12, 50] as [number, number], zoom: 3.6 },
  { id: "uk", name: "United Kingdom", country: "United Kingdom", sub: "London & UK", center: [-2, 54] as [number, number], zoom: 4.5 },
  { id: "af", name: "Africa", country: "Nigeria", sub: "Nigeria, Kenya, SA", center: [18, 5] as [number, number], zoom: 3.2 },
  { id: "ap", name: "Asia-Pacific", country: "India", sub: "India & Singapore", center: [85, 22] as [number, number], zoom: 3.2 },
  { id: "latam", name: "Latin America", country: "Brazil", sub: "Brazil & LatAm", center: [-58, -15] as [number, number], zoom: 3.0 },
];

// Region to approximate coordinate mapping for plotting real issue markers on the map
const REGION_COORDINATES: Record<string, [number, number]> = {
  "North America": [-98, 38],
  "United States": [-95, 37],
  "Canada": [-106, 56],
  "Europe": [10, 50],
  "Germany": [10.4, 51.1],
  "United Kingdom": [-1.5, 52.5],
  "Africa": [8, 9],
  "Nigeria": [7.5, 9.0],
  "Kenya": [37.9, 0.0],
  "South Africa": [24.0, -29.0],
  "Asia-Pacific": [78.9, 20.5],
  "India": [78.9, 20.5],
  "Singapore": [103.8, 1.35],
  "Latin America": [-51.9, -14.2],
  "Brazil": [-51.9, -14.2],
  "Global": [0, 20]
};

function MarketIntelligencePlatform() {
  const [issues, setIssues] = useState<ScrapedIssue[]>([]);
  const [neuralExemplars, setNeuralExemplars] = useState<NeuralExemplar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);

  // Geographic Selection state
  const [selectedZone, setSelectedZone] = useState(GEOGRAPHIC_ZONES[0]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Mission Launch Modal State
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [missionObjective, setMissionObjective] = useState("developer_pain_points");
  const [missionDepth, setMissionDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [missionSource, setMissionSource] = useState("github");

  // Detailed Opportunity Drawer State
  const [selectedIssue, setSelectedIssue] = useState<ScrapedIssue | null>(null);
  const [editStatus, setEditStatus] = useState<ScrapedIssue["status"]>("new");
  const [editNotes, setEditNotes] = useState("");
  const [editScore, setEditScore] = useState(50);
  const [saving, setSaving] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  // Filters State
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "newest">("score");

  // Real Telemetry Log Stream
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Server function bindings
  const runScraper = useServerFn(triggerScraperAgent);
  const updateIssue = useServerFn(updateScrapedIssue);
  const deleteIssue = useServerFn(deleteScrapedIssue);
  const trainMemory = useServerFn(trainAgentMemory);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [telemetryLogs]);

  // Fetch real live records from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("scraped_issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIssues(((data ?? []) as unknown) as ScrapedIssue[]);

      // Fetch neural exemplars
      const { data: memData, error: memErr } = await (supabase as any)
        .from("agent_learning_memory")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!memErr && memData) {
        setNeuralExemplars(memData as NeuralExemplar[]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Database connection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Supabase Realtime CDC Listener
  useEffect(() => {
    fetchData();

    const channel = (supabase as any)
      .channel("market-intelligence-cdc")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraped_issues" },
        (payload: any) => {
          setTelemetryLogs((prev) => [
            ...prev,
            {
              timestamp: new Date().toLocaleTimeString(),
              level: "success",
              message: `POSTGRES CDC: ${payload.eventType.toUpperCase()} on scraped_issues. Syncing state.`,
            },
          ]);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  // Initialize MapLibre GL WebGL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "carto-dark": {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap, © CARTO"
            }
          },
          layers: [
            {
              id: "carto-dark-layer",
              type: "raster",
              source: "carto-dark",
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [15, 20],
        zoom: 1.3,
        pitch: 20,
        bearing: 0,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");

      mapInstanceRef.current = map;
    } catch (e) {
      console.warn("MapLibre GL WebGL initialization note:", e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync real issue markers on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Group real issues by location for marker clustering
    const locationCounts: Record<string, { count: number; maxScore: number; latLon: [number, number] }> = {};

    issues.forEach((issue) => {
      const locKey = issue.location_country || issue.location_region || "Global";
      const coords = REGION_COORDINATES[locKey] || REGION_COORDINATES[issue.location_region] || [0, 20];
      
      if (!locationCounts[locKey]) {
        locationCounts[locKey] = { count: 0, maxScore: 0, latLon: coords };
      }
      locationCounts[locKey].count += 1;
      locationCounts[locKey].maxScore = Math.max(locationCounts[locKey].maxScore, issue.market_value_score);
    });

    // Create markers only where real data exists
    Object.entries(locationCounts).forEach(([locName, data]) => {
      if (data.count === 0) return;

      const el = document.createElement("div");
      el.className = "group cursor-pointer flex flex-col items-center";

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-brand opacity-40"></span>
          <div class="relative flex items-center justify-center h-5 px-1.5 rounded-full bg-brand text-black font-mono font-bold text-[10px] shadow-lg shadow-brand/30 border border-white/40">
            ${data.count}
          </div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border px-2 py-0.5 rounded text-[10px] text-foreground font-mono font-bold whitespace-nowrap mt-1 shadow-md pointer-events-none">
          ${locName}: ${data.count} signals
        </div>
      `;

      el.addEventListener("click", () => {
        const zoneMatch = GEOGRAPHIC_ZONES.find((z) => z.name === locName || z.country === locName);
        if (zoneMatch) {
          setSelectedZone(zoneMatch);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(data.latLon)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [issues]);

  // Smooth camera navigation when selectedZone changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo({
      center: selectedZone.center,
      zoom: selectedZone.zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true
    });
  }, [selectedZone]);

  useEffect(() => {
    if (selectedIssue) {
      setEditStatus(selectedIssue.status);
      setEditNotes(selectedIssue.solution_notes || "");
      setEditScore(selectedIssue.market_value_score);
    }
  }, [selectedIssue]);

  // Launch Live Scraper Mission
  const handleLaunchMission = async () => {
    setMissionModalOpen(false);
    setIsResearching(true);
    setTelemetryLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `MISSION INITIATED: Scope [${selectedZone.name.toUpperCase()}] / Depth [${missionDepth.toUpperCase()}] / Objective [${missionObjective}]`,
      },
    ]);

    try {
      const res = await runScraper({
        data: {
          region: selectedZone.name,
          country: selectedZone.country,
          locationQuery: selectedZone.id === "all" ? "" : selectedZone.country,
          objective: missionObjective,
          depth: missionDepth,
          source: missionSource,
        },
      });

      if (res.ok) {
        toast.success(`Mission complete: Discovered ${res.insertedCount} new opportunities in ${selectedZone.name}.`);
        if (res.logs && Array.isArray(res.logs)) {
          setTelemetryLogs(res.logs);
        }
        fetchData();
      } else {
        toast.error("Mission finished with warnings. Review telemetry stream.");
        if (res.logs && Array.isArray(res.logs)) {
          setTelemetryLogs(res.logs);
        }
      }
    } catch (err: any) {
      toast.error("Research mission error: " + err.message);
      setTelemetryLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: "error",
          message: `SOURCE ERROR: ${err.message}`,
        },
      ]);
    } finally {
      setIsResearching(false);
    }
  };

  // Train AI Neural Memory (Self-Learning Loop)
  const handleTrainModel = async () => {
    if (!selectedIssue || !editNotes.trim()) {
      toast.error("Please formulate a solution blueprint before training neural memory.");
      return;
    }
    setIsTraining(true);
    try {
      const res = await trainMemory({
        data: {
          category: selectedIssue.category || "Web App Dev",
          solution_notes: editNotes,
          issueId: selectedIssue.id,
        },
      });

      if (res.ok) {
        toast.success("Neural Memory exemplar saved. Future AI missions will learn from this pattern.");
        setIssues((prev) =>
          prev.map((i) => (i.id === selectedIssue.id ? { ...i, feedback_score: 1 } : i))
        );
        fetchData();
      }
    } catch (err: any) {
      toast.error("Training failed: " + err.message);
    } finally {
      setIsTraining(false);
    }
  };

  // Save changes to opportunity
  const handleSaveIssue = async () => {
    if (!selectedIssue) return;
    setSaving(true);
    try {
      const res = await updateIssue({
        data: {
          id: selectedIssue.id,
          status: editStatus,
          solution_notes: editNotes,
          market_value_score: editScore,
        },
      });

      if (res.ok) {
        toast.success("Opportunity blueprint updated successfully.");
        setIssues((prev) =>
          prev.map((i) =>
            i.id === selectedIssue.id
              ? { ...i, status: editStatus, solution_notes: editNotes, market_value_score: editScore }
              : i
          )
        );
        setSelectedIssue(null);
      }
    } catch (err: any) {
      toast.error("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Discard opportunity
  const handleDeleteIssue = async (id: string) => {
    if (!confirm("Are you sure you want to discard this research record?")) return;
    try {
      const res = await deleteIssue({ data: { id } });
      if (res.ok) {
        toast.success("Opportunity discarded.");
        setIssues((prev) => prev.filter((i) => i.id !== id));
        if (selectedIssue?.id === id) setSelectedIssue(null);
      }
    } catch (err: any) {
      toast.error("Discard failed: " + err.message);
    }
  };

  // Real Calculated Metrics (Zero Mock Data)
  const totalObservations = issues.length;
  const highValueCount = issues.filter((i) => i.market_value_score >= 75).length;
  const avgOpportunityScore =
    totalObservations > 0
      ? Math.round(issues.reduce((acc, i) => acc + i.market_value_score, 0) / totalObservations)
      : null;
  const distinctMarketsCount = new Set(issues.map((i) => i.location_country).filter(Boolean)).size;

  // Real Category Distribution (Market Pulse)
  const categoryMap = useMemo(() => {
    return issues.reduce((acc: Record<string, number>, issue) => {
      const cat = issue.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
  }, [issues]);

  const categories = Object.keys(categoryMap);

  // Real Domain Clusters for Opportunity Radar
  const domainClusters = useMemo(() => {
    const map: Record<string, { count: number; avgScore: number; totalScore: number }> = {};
    issues.forEach((i) => {
      const cat = i.category || "Other";
      if (!map[cat]) {
        map[cat] = { count: 0, avgScore: 0, totalScore: 0 };
      }
      map[cat].count += 1;
      map[cat].totalScore += i.market_value_score;
    });

    return Object.entries(map).map(([domain, d]) => ({
      domain,
      count: d.count,
      avgScore: Math.round(d.totalScore / d.count),
    }));
  }, [issues]);

  // Filtered Opportunities List
  const filteredIssues = issues
    .filter((i) => {
      const matchesZone = selectedZone.id === "all" || i.location_region === selectedZone.name;
      const matchesCluster = selectedCluster === null || i.category === selectedCluster;
      const matchesCategory = filterCategory === "all" || i.category === filterCategory;
      const matchesStatus = filterStatus === "all" || i.status === filterStatus;
      const matchesSearch =
        searchTerm === "" ||
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.description && i.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.category && i.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesZone && matchesCluster && matchesCategory && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.market_value_score - a.market_value_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full min-h-full bg-background text-foreground font-sans selection:bg-brand selection:text-black">
      
      {/* 1. Terminal Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase text-muted-foreground">
            <span className="text-brand font-bold">OKIKE</span>
            <span>/</span>
            <span>GLOBAL MARKET INTELLIGENCE SYSTEM</span>
            <span>/</span>
            <span className="text-muted-foreground">{selectedZone.name.toUpperCase()}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Geospatial Autonomous Research Terminal
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Agent Status */}
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className={`size-2 rounded-full ${isResearching ? "bg-brand animate-ping" : "bg-emerald-400"}`} />
            <span className="text-muted-foreground text-[11px]">AGENT:</span>
            <span className={`font-bold ${isResearching ? "text-brand" : "text-emerald-400"}`}>
              {isResearching ? "RESEARCHING" : "OPERATIONAL"}
            </span>
          </div>

          {/* New Mission Launch Button */}
          <Button
            onClick={() => setMissionModalOpen(true)}
            disabled={isResearching}
            className="bg-brand hover:bg-brand/90 text-brand-foreground font-mono font-bold text-xs tracking-wide px-4 py-2 rounded-lg transition-all shadow-lg flex items-center gap-1.5"
          >
            <Plus className="size-4 stroke-[3]" />
            NEW RESEARCH MISSION
          </Button>
        </div>
      </div>

      {/* 2. Primary Canvas: 60% Hero Geospatial Map + 40% Asymmetric Intelligence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Hero Interactive WebGL Geospatial Map (~60% width / 7 cols) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          
          {/* Top Floating Map HUD */}
          <div className="flex items-center justify-between mb-3 z-10 font-mono text-xs">
            <div className="flex items-center gap-2">
              <div className="bg-background/90 border border-border px-3 py-1 rounded-md text-foreground font-bold flex items-center gap-1.5 shadow">
                <Globe className="size-3.5 text-brand" />
                <span>SCOPE: {selectedZone.id === "all" ? "GLOBAL" : `GLOBAL / ${selectedZone.name.toUpperCase()}`}</span>
              </div>
            </div>

            <div className="bg-background/90 border border-border px-3 py-1 rounded-md text-muted-foreground text-[11px] flex items-center gap-2 shadow">
              <span className="size-2 rounded-full bg-brand" />
              <span>LIVE SIGNALS: {totalObservations}</span>
            </div>
          </div>

          {/* WebGL Dark Vector Map Container */}
          <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-border shadow-inner bg-background">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Subtle Horizon Atmospheric Lighting */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card/80 via-transparent to-transparent" />
          </div>

          {/* Hierarchical Digital Grid Selector Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mt-3.5 z-10 font-mono text-xs">
            {GEOGRAPHIC_ZONES.map((zone) => {
              const active = selectedZone.id === zone.id;
              const count =
                zone.id === "all"
                  ? issues.length
                  : issues.filter((i) => i.location_region === zone.name).length;

              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    active
                      ? "bg-background border-brand text-foreground shadow-md ring-1 ring-brand/30"
                      : "bg-background/60 border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] truncate">{zone.name}</span>
                    {active && <span className="size-1.5 rounded-full bg-brand" />}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {count > 0 ? `${count} signals` : "0 active"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Asymmetric Intelligence Panel (~40% width / 5 cols) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-2xl space-y-5">
          
          {/* Top Panel: Market Pulse */}
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border font-mono text-xs">
              <span className="text-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="size-3.5 text-brand" />
                MARKET PULSE
              </span>
              <span className="text-brand text-[10px] font-bold">● LIVE TELEMETRY</span>
            </div>

            {/* Compact Metric Readouts */}
            <div className="grid grid-cols-2 gap-2.5 mt-3 font-mono">
              <div className="bg-background border border-border p-3 rounded-xl">
                <div className="text-[10px] text-muted-foreground uppercase">OBSERVATIONS</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{totalObservations}</div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl">
                <div className="text-[10px] text-muted-foreground uppercase">HIGH-VALUE SIGNALS</div>
                <div className="text-lg font-bold text-brand mt-0.5">{highValueCount}</div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl">
                <div className="text-[10px] text-muted-foreground uppercase">ACTIVE MARKETS</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{distinctMarketsCount}</div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl">
                <div className="text-[10px] text-muted-foreground uppercase">AVG SCORE</div>
                <div className="text-lg font-bold text-brand mt-0.5">
                  {avgOpportunityScore !== null ? `${avgOpportunityScore}/100` : "—"}
                </div>
              </div>
            </div>

            {/* Category Sector Breakdown (Bar Gauges) */}
            <div className="mt-4">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>SECTOR CONCENTRATION</span>
                <span className="text-[10px] text-muted-foreground">{categories.length} Categories</span>
              </div>

              {categories.length === 0 ? (
                <div className="bg-background border border-border rounded-xl p-3 text-center text-xs text-muted-foreground font-mono">
                  Insufficient data for trend analysis.
                </div>
              ) : (
                <div className="space-y-1.5 font-mono text-xs">
                  {categories.slice(0, 4).map((cat) => {
                    const count = categoryMap[cat];
                    const pct = Math.round((count / totalObservations) * 100);

                    return (
                      <div key={cat} className="bg-background border border-border p-2 rounded-lg flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground truncate">{cat}</span>
                          <span className="font-bold text-brand">{pct}%</span>
                        </div>
                        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                          <div className="bg-brand h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Neural Learnings & Live Stream Section */}
          <div className="pt-3 border-t border-border font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="size-3.5 text-brand" />
                WHAT THE AGENT IS LEARNING
              </span>
              <span className="text-[10px] text-brand">{neuralExemplars.length} Patterns</span>
            </div>

            {neuralExemplars.length === 0 ? (
              <div className="bg-background border border-border rounded-xl p-3 text-xs text-muted-foreground">
                No custom training exemplars yet. Formulate solution blueprints to train model memory.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                {neuralExemplars.map((ex) => (
                  <div key={ex.id} className="bg-background border border-border p-2 rounded-lg">
                    <div className="flex items-center justify-between text-[10px] text-brand font-bold mb-0.5">
                      <span>{ex.pattern_category}</span>
                      <span className="text-muted-foreground">{new Date(ex.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 font-sans">
                      {ex.successful_blueprint_summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Middle Row: Opportunity Radar Cluster Field & Discovered Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Opportunity Radar & Domain Clusters (4 cols) */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-5 shadow-xl flex flex-col justify-between font-mono">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border text-xs">
              <span className="text-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                <Radar className="size-4 text-brand" />
                OPPORTUNITY RADAR CLUSTERS
              </span>
              <span className="text-[10px] text-muted-foreground">CLUSTER FIELD</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-2 font-sans">
              Click a market domain cluster below to isolate related technical pain points.
            </p>

            {/* Cluster Nodes */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {domainClusters.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground text-xs">
                  0 clusters identified
                </div>
              ) : (
                domainClusters.map((c) => {
                  const active = selectedCluster === c.domain;
                  return (
                    <button
                      key={c.domain}
                      onClick={() => setSelectedCluster(active ? null : c.domain)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        active
                          ? "bg-background border-brand text-brand shadow-md scale-102 ring-1 ring-brand/30"
                          : "bg-background/70 border-border text-foreground hover:border-foreground/30 hover:text-brand"
                      }`}
                    >
                      <span className="font-bold text-[11px] truncate">{c.domain}</span>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{c.count} signals</span>
                        <span className="text-brand font-bold">Avg {c.avgScore}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {selectedCluster && (
            <button
              onClick={() => setSelectedCluster(null)}
              className="mt-3 text-[10px] text-muted-foreground hover:text-foreground text-center underline"
            >
              Reset Cluster Filter
            </button>
          )}
        </div>

        {/* Discovered Opportunity Intelligence Feed (8 cols) */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-5 shadow-xl flex flex-col gap-4 font-sans">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Target className="size-4 text-brand" />
                Discovered Opportunity Intelligence ({filteredIssues.length})
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-brand"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="solved">Solved</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-xs">
              <RefreshCw className="size-5 animate-spin mx-auto text-brand mb-2" />
              Connecting to live intelligence records...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-14 bg-background border border-border border-dashed rounded-xl p-6 font-mono text-xs text-muted-foreground">
              <div className="font-bold text-foreground mb-1">0 active opportunities</div>
              <div>No research records found matching current scope [{selectedZone.name}].</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredIssues.map((issue) => {
                const score = issue.market_value_score;

                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    className="bg-background hover:bg-muted/40 border border-border hover:border-brand/60 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 font-mono text-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded">
                          {issue.category || "General"}
                        </span>
                        <span className="text-xs font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded">
                          Score {score}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground group-hover:text-brand transition-colors line-clamp-2 mb-1.5">
                        {issue.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                        {issue.description || "No analysis provided."}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-border flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="size-3 text-brand" />
                        <span className="truncate">{issue.location_country || issue.location_region}</span>
                      </div>

                      <span className="text-brand font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        VIEW INTELLIGENCE
                        <ArrowUpRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 4. Live Research Telemetry Stream */}
      {telemetryLogs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xl font-mono text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-border text-muted-foreground">
            <span className="font-bold text-foreground flex items-center gap-2">
              <Radio className="size-3.5 text-brand" />
              LIVE RESEARCH ACTIVITY TELEMETRY
            </span>
            <span className="text-[10px] text-muted-foreground">EVENT LOG</span>
          </div>

          <div className="p-3 my-2 max-h-32 overflow-y-auto bg-background border border-border rounded-xl space-y-1 scrollbar-thin">
            {telemetryLogs.filter(Boolean).map((log, index) => (
              <div key={index} className="flex gap-2 items-start leading-relaxed text-[11px]">
                <span className="text-muted-foreground select-none">[{log?.timestamp || ""}]</span>
                <span
                  className={
                    log?.level === "success"
                      ? "text-brand font-bold"
                      : log?.level === "warn"
                      ? "text-amber-400"
                      : log?.level === "error"
                      ? "text-red-400 font-bold"
                      : "text-foreground"
                  }
                >
                  {log?.message || String(log)}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* 5. New Research Mission Launcher Modal */}
      {missionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-border">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Sparkles className="size-4 text-brand" />
                NEW RESEARCH MISSION LAUNCHER
              </div>
              <button
                onClick={() => setMissionModalOpen(false)}
                className="p-1 hover:bg-muted rounded-md text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 font-sans text-xs">
              {/* Scope */}
              <div>
                <label className="text-muted-foreground uppercase text-[10px] font-bold font-mono block mb-1.5">
                  1. Geographic Research Scope
                </label>
                <select
                  value={selectedZone.id}
                  onChange={(e) =>
                    setSelectedZone(GEOGRAPHIC_ZONES.find((z) => z.id === e.target.value) || GEOGRAPHIC_ZONES[0])
                  }
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-brand"
                >
                  {GEOGRAPHIC_ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.sub})
                    </option>
                  ))}
                </select>
              </div>

              {/* Objective */}
              <div>
                <label className="text-muted-foreground uppercase text-[10px] font-bold font-mono block mb-1.5">
                  2. Research Objective
                </label>
                <select
                  value={missionObjective}
                  onChange={(e) => setMissionObjective(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-brand"
                >
                  <option value="developer_pain_points">Developer Pain Points & Unsolved Bugs</option>
                  <option value="saas_opportunities">Commercial SaaS Gaps & Feature Requests</option>
                  <option value="ai_opportunities">AI & LLM Integration Bottlenecks</option>
                  <option value="infrastructure_problems">Cloud & Infrastructure Scaling Friction</option>
                </select>
              </div>

              {/* Depth */}
              <div>
                <label className="text-muted-foreground uppercase text-[10px] font-bold font-mono block mb-1.5">
                  3. Mission Depth
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {(["quick", "standard", "deep"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMissionDepth(d)}
                      className={`p-2.5 rounded-xl border text-center uppercase font-bold transition-all ${
                        missionDepth === d
                          ? "bg-background border-brand text-brand ring-1 ring-brand/30"
                          : "bg-background/60 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="text-muted-foreground uppercase text-[10px] font-bold font-mono block mb-1.5">
                  4. Connected Real-World Intelligence Feeds
                </label>
                <select
                  value={missionSource}
                  onChange={(e) => setMissionSource(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-brand font-mono text-xs"
                >
                  <option value="all">⚡ Multi-Source Hybrid (GitHub + Hacker News + StackOverflow + Dev.to)</option>
                  <option value="github">🐙 GitHub Ecosystem Repos & Framework Trackers</option>
                  <option value="hackernews">🟠 Hacker News (Y Combinator - Founders & CTOs)</option>
                  <option value="stackoverflow">🥞 StackOverflow (Production Bottlenecks)</option>
                  <option value="devto">📝 Dev.to Technical Radar</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-3 font-mono">
              <Button
                variant="secondary"
                onClick={() => setMissionModalOpen(false)}
                className="bg-background border border-border text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLaunchMission}
                className="bg-brand hover:bg-brand/90 text-brand-foreground font-bold text-xs px-5 shadow"
              >
                LAUNCH MISSION
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Detailed Opportunity Drawer */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-end">
          <div className="absolute inset-0" onClick={() => setSelectedIssue(null)} />

          <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col p-6 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-brand font-bold uppercase tracking-wider bg-brand/10 border border-brand/20 px-2 py-0.5 rounded">
                    {selectedIssue.category || "General"}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3 text-brand" />
                    {selectedIssue.location_country || selectedIssue.location_region}
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground mt-1 pr-4">
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground self-start"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 scrollbar-thin text-xs">
              {/* Score indicator */}
              <div className="bg-background border border-border p-4 rounded-xl flex items-center justify-between font-mono">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Opportunity Score</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Commercial Feasibility Index</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-brand">{editScore}/100</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="w-20 accent-brand cursor-pointer"
                  />
                </div>
              </div>

              {/* Evidence Link */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted-foreground mb-2">
                  Verified Evidence Source
                </div>
                <a
                  href={selectedIssue.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-background border border-border rounded-xl text-brand font-mono hover:border-brand transition-colors"
                >
                  <span className="flex items-center gap-2 truncate">
                    <ExternalLink className="size-4 shrink-0" />
                    Open Source Record ({selectedIssue.source_platform.toUpperCase()})
                  </span>
                  <ArrowUpRight className="size-4 shrink-0" />
                </a>
              </div>

              {/* Problem Analysis */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted-foreground mb-2">
                  Problem & Pain Point Analysis
                </div>
                <div className="p-4 bg-background border border-border rounded-xl leading-relaxed text-foreground">
                  {selectedIssue.description || "No analysis provided."}
                </div>
              </div>

              {/* OKIKE Solution Blueprint */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-brand">
                    <BookOpen className="size-3.5" />
                    OKIKE Strategic Solution Blueprint
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Formulate tool development or curriculum roadmap notes..."
                  className="w-full bg-background border border-border rounded-xl p-3.5 leading-relaxed text-foreground focus:outline-none focus:border-brand font-sans"
                />
              </div>

              {/* Neural Memory Training */}
              <div className="bg-background border border-brand/30 p-4 rounded-xl flex items-center justify-between font-mono">
                <div>
                  <div className="text-xs font-bold text-brand flex items-center gap-1.5">
                    <Brain className="size-4 text-brand" />
                    Train Neural Memory
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-sans">
                    Store as exemplar to guide future automated research missions.
                  </div>
                </div>
                <Button
                  onClick={handleTrainModel}
                  disabled={isTraining}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs font-bold px-3 py-2 rounded-lg"
                >
                  {isTraining ? "Training..." : "Train Model"}
                </Button>
              </div>

              {/* Status Action */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted-foreground mb-2">
                  Investigation Status
                </div>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                  {(["new", "reviewed", "solved", "ignored"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`py-2 rounded-lg font-bold uppercase border transition-all ${
                        editStatus === s
                          ? "bg-background border-brand text-brand ring-1 ring-brand/30"
                          : "bg-background/60 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3 font-mono">
              <Button
                variant="secondary"
                onClick={() => handleDeleteIssue(selectedIssue.id)}
                className="py-5 px-4 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold"
              >
                <Trash2 className="size-4 mr-1" />
                Discard
              </Button>
              <Button
                onClick={handleSaveIssue}
                disabled={saving}
                className="flex-1 py-5 rounded-xl bg-brand hover:bg-brand/90 text-brand-foreground font-bold text-xs"
              >
                {saving ? "Saving..." : "Save Opportunity Blueprint"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
