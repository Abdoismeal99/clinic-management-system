import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Archive as ArchiveIcon, RotateCcw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";

export default function Archive() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const { data, isLoading } = trpc.patients.list.useQuery({ search: search || undefined, isDeleted: true, page, limit: 15 });
  const restoreMutation = trpc.patients.restore.useMutation({ onSuccess: () => { toast.success("Patient restored"); utils.patients.list.invalidate(); setRestoreId(null); }, onError: (e) => toast.error(e.message) });
  const canRestore = user?.role === "admin" || user?.role === "doctor";
  const totalPages = Math.ceil((data?.total ?? 0) / 15);
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div><h1 className="text-2xl font-bold text-foreground">Patient Archive</h1><p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} archived patients</p></div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search archived patients..." className="pl-9 h-9" />
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : data?.data?.length === 0 ? <div className="text-center py-16 text-muted-foreground"><ArchiveIcon className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No archived patients found</p></div>
        : <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Date of Birth</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data?.data?.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-medium">{p.fullName}</p><p className="text-xs text-muted-foreground">{p.phone}</p></td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{p.patientId}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">{p.dateOfBirth ? format(new Date(p.dateOfBirth), "MMM d, yyyy") : "—"}</td>
                    <td className="px-4 py-3"><Badge className="text-xs bg-red-50 text-red-700 border-red-200">Archived</Badge></td>
                    <td className="px-4 py-3"><div className="flex justify-end">{canRestore && <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setRestoreId(p.id)}><RotateCcw className="w-3 h-3" /> Restore</Button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-border"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1"><ChevronLeft className="w-3 h-3" /> Prev</Button><Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-8 gap-1">Next <ChevronRight className="w-3 h-3" /></Button></div></div>}
        </>}
      </CardContent></Card>
      <Dialog open={!!restoreId} onOpenChange={(v) => !v && setRestoreId(null)}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Restore Patient?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">The patient will be moved back to the active patient list.</p><DialogFooter><Button variant="outline" onClick={() => setRestoreId(null)}>Cancel</Button><Button onClick={() => restoreId && restoreMutation.mutate({ id: restoreId })} disabled={restoreMutation.isPending}>{restoreMutation.isPending ? "Restoring..." : "Restore"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
