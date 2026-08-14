import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldAlert, 
  Clock, 
  Search, 
  Eye, 
  X, 
  Loader2, 
  Database, 
  User, 
  Filter 
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  async function loadLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error("Failed to load audit logs: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.user_email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (log.row_id?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesTable = selectedTable ? log.table_name === selectedTable : true;
    const matchesAction = selectedAction ? log.action === selectedAction : true;
    return matchesSearch && matchesTable && matchesAction;
  });

  // Extract unique tables for filter dropdown
  const uniqueTables = Array.from(new Set(logs.map((l) => l.table_name)));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-ink/10">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink flex items-center gap-2">
            <ShieldAlert className="size-8 text-brand" /> Operation Audit Logs
          </h1>
          <p className="text-xs text-ink/50 mt-1">
            Tamper-proof history of administrative inserts, updates, and deletes to ensure non-repudiation.
          </p>
        </div>
        <button 
          onClick={loadLogs}
          className="text-xs font-bold text-brand uppercase tracking-wider border border-brand/20 hover:bg-brand/5 px-4 py-2"
        >
          Refresh Logs
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-card border border-ink/10 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 size-4 text-ink/40" />
          <input
            type="text"
            placeholder="Search email or row ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-ink/15 pl-9 pr-4 py-2.5 text-xs text-ink focus:outline-none focus:border-brand"
          />
        </div>

        {/* Action filter */}
        <div className="relative">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-surface border border-ink/15 px-3 py-2.5 text-xs text-ink focus:outline-none focus:border-brand appearance-none"
          >
            <option value="">All Actions (INSERT/UPDATE/DELETE)</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        {/* Table filter */}
        <div className="relative">
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full bg-surface border border-ink/15 px-3 py-2.5 text-xs text-ink focus:outline-none focus:border-brand appearance-none"
          >
            <option value="">All Tables</option>
            {uniqueTables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-card border border-ink/10 text-ink/50 text-xs">
          No audit log entries matching filters found.
        </div>
      ) : (
        <div className="bg-card border border-ink/10 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink/10 bg-surface/50 text-[10px] font-bold uppercase tracking-wider text-ink/65">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Admin Email</th>
                <th className="p-4">Action</th>
                <th className="p-4">Table</th>
                <th className="p-4">Row Key/ID</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filteredLogs.map((log) => {
                const isDelete = log.action === "DELETE";
                const isInsert = log.action === "INSERT";
                const isUpdate = log.action === "UPDATE";
                
                const badgeColor = isInsert 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : isDelete 
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20";

                return (
                  <tr key={log.id} className="hover:bg-surface/30 transition">
                    <td className="p-4 whitespace-nowrap text-ink/60 flex items-center gap-1.5">
                      <Clock className="size-3.5 text-ink/40" />
                      {formatDate(log.created_at)}
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium text-ink flex items-center gap-1.5">
                      <User className="size-3.5 text-ink/40" />
                      {log.user_email || "System/Anonymous"}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase border ${badgeColor}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-ink/75 flex items-center gap-1.5">
                      <Database className="size-3.5 text-ink/40" />
                      {log.table_name}
                    </td>
                    <td className="p-4 font-mono text-ink/50 max-w-[180px] truncate" title={log.row_id}>
                      {log.row_id || "—"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-brand uppercase tracking-wider hover:opacity-85"
                      >
                        <Eye className="size-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect Modal Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-card border-l border-ink/10 h-full p-6 md:p-8 flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-ink/10">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold uppercase text-ink">
                  Log Record Inspection
                </h3>
                <p className="text-[10px] font-mono text-ink/40">
                  Log ID: {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-surface rounded transition text-ink/40 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 py-6 border-b border-ink/5 text-xs">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink/40 block">User Email</span>
                <span className="font-medium text-ink">{selectedLog.user_email || "System/Anonymous"}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink/40 block">Timestamp</span>
                <span className="font-medium text-ink">{formatDate(selectedLog.created_at)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink/40 block">Table Affected</span>
                <span className="font-mono font-medium text-ink">{selectedLog.table_name}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink/40 block">Action Type</span>
                <span className="font-mono font-extrabold text-brand uppercase">{selectedLog.action}</span>
              </div>
            </div>

            {/* JSON Data Viewer */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {/* If DELETE / UPDATE -> show old data */}
              {(selectedLog.action === "DELETE" || selectedLog.action === "UPDATE") && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block">
                    Old Data State (Before)
                  </span>
                  <pre className="bg-surface p-4 border border-ink/10 text-[10px] font-mono text-ink/80 overflow-auto max-h-[220px]">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {/* If INSERT / UPDATE -> show new data */}
              {(selectedLog.action === "INSERT" || selectedLog.action === "UPDATE") && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 block">
                    New Data State (After)
                  </span>
                  <pre className="bg-surface p-4 border border-ink/10 text-[10px] font-mono text-ink/80 overflow-auto max-h-[220px]">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-ink/10 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-ink text-contrast-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
