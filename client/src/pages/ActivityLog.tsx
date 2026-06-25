import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  patient_created: "bg-green-50 text-green-700 border-green-200",
  patient_updated: "bg-blue-50 text-blue-700 border-blue-200",
  patient_deleted: "bg-red-50 text-red-700 border-red-200",
  patient_restored: "bg-purple-50 text-purple-700 border-purple-200",
  visit_created: "bg-green-50 text-green-700 border-green-200",
  visit_updated: "bg-blue-50 text-blue-700 border-blue-200",
  prescription_created: "bg-amber-50 text-amber-700 border-amber-200",
  appointment_created: "bg-cyan-50 text-cyan-700 border-cyan-200",
  file_uploaded: "bg-indigo-50 text-indigo-700 border-indigo-200",
  file_deleted: "bg-red-50 text-red-700 border-red-200",
};

export default function ActivityLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = trpc.activity.list.useQuery({ entityType: entityType || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, limit: 20 });
  const totalPages = Math.ceil((data?.total ?? 0) / 20);
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-bold text-foreground">Activity Log</h1><p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total events tracked</p></div>
      <div className="flex gap-3 flex-wrap">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="patient">Patients</SelectItem><SelectItem value="visit">Visits</SelectItem><SelectItem value="prescription">Prescriptions</SelectItem><SelectItem value="appointment">Appointments</SelectItem><SelectItem value="file">Files</SelectItem></SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-40 h-9" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-40 h-9" placeholder="To" />
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : data?.data?.length === 0 ? <div className="text-center py-16 text-muted-foreground"><Activity className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No activity found</p></div>
        : <div className="divide-y divide-border">
          {data?.data?.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Activity className="w-4 h-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><Badge className={`text-xs border ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground border-border"}`}>{log.action?.replace(/_/g, " ")}</Badge><span className="text-sm text-foreground">{log.description}</span></div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><span>{(log as any).userName ?? `User #${log.userId}`}</span><span>·</span><span>{format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}</span></div>
              </div>
            </div>
          ))}
        </div>}
        {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-border"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1"><ChevronLeft className="w-3 h-3" /> Prev</Button><Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-8 gap-1">Next <ChevronRight className="w-3 h-3" /></Button></div></div>}
      </CardContent></Card>
    </div>
  );
}
