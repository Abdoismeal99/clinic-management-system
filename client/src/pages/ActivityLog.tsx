import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Activity, User, Calendar, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  patient_created: "bg-green-50 text-green-700 border-green-200",
  patient_updated: "bg-blue-50 text-blue-700 border-blue-200",
  patient_deleted: "bg-red-50 text-red-700 border-red-200",
  patient_restored: "bg-teal-50 text-teal-700 border-teal-200",
  visit_created: "bg-purple-50 text-purple-700 border-purple-200",
  visit_updated: "bg-indigo-50 text-indigo-700 border-indigo-200",
  visit_deleted: "bg-red-50 text-red-700 border-red-200",
  prescription_created: "bg-amber-50 text-amber-700 border-amber-200",
  file_uploaded: "bg-cyan-50 text-cyan-700 border-cyan-200",
  file_deleted: "bg-red-50 text-red-700 border-red-200",
  appointment_created: "bg-green-50 text-green-700 border-green-200",
  appointment_updated: "bg-blue-50 text-blue-700 border-blue-200",
};

const ENTITY_TYPES = ["all", "patient", "visit", "prescription", "file", "appointment"];

function exportCSV(data: any[]) {
  if (!data.length) return;
  const headers = "ID,User,Action,Entity Type,Entity ID,Description,Date";
  const rows = data.map((a) => `${a.id},"${a.userName ?? ""}","${a.action}","${a.entityType ?? ""}","${a.entityId ?? ""}","${a.description ?? ""}","${a.createdAt ? format(new Date(a.createdAt), "yyyy-MM-dd HH:mm") : ""}"`).join("\n");
  const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "activity-log.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function ActivityLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const LIMIT = 25;

  const { data, isLoading } = trpc.activity.list.useQuery({
    entityType: entityType !== "all" ? entityType : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: LIMIT,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all actions performed in the system</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => exportCSV(logs)}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm" />
            </div>
          </div>
          {(entityType !== "all" || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs gap-1" onClick={() => { setEntityType("all"); setDateFrom(""); setDateTo(""); setPage(1); }}>
              <Filter className="w-3 h-3" /> Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Activity Log</span>
            <Badge variant="secondary">{total} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No activity found</p>
              <p className="text-sm mt-1">Actions will appear here as users interact with the system</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.userName ?? `User #${log.userId}`}</span>
                      <Badge className={`text-xs border ${ACTION_COLORS[log.action] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      {log.entityType && <Badge variant="outline" className="text-xs">{log.entityType}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{log.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy h:mm a") : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1"><ChevronLeft className="w-3 h-3" /> Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-8 gap-1">Next <ChevronRight className="w-3 h-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
