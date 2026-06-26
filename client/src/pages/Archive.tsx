import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Archive, RotateCcw, Search, User, Calendar, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function ArchivePage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const LIMIT = 20;

  const { data, isLoading } = trpc.patients.list.useQuery({ search, isDeleted: true, page, limit: LIMIT });
  const patients = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const restoreMutation = trpc.patients.restore.useMutation({
    onSuccess: () => {
      toast.success("Patient restored successfully");
      utils.patients.list.invalidate();
      setRestoreId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const canRestore = true; // All users can restore

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Archive className="w-6 h-6 text-primary" /> Patient Archive</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Archived patients can be restored at any time. No data is permanently deleted.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث في المرضى المؤرشفين..." className="pl-9 h-9 text-sm" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="gap-1.5"><Archive className="w-3 h-3" /> {total} archived patients</Badge>
        {!canRestore && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Only admins and doctors can restore patients</Badge>}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{search ? "No archived patients match your search" : "No archived patients"}</p>
              <p className="text-sm mt-1">Patients you archive will appear here and can be restored</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {patients.map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{p.fullName}</p>
                      <Badge variant="outline" className="text-xs">{p.patientId}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{p.gender}</Badge>
                      {p.status && <Badge className="text-xs bg-red-50 text-red-700 border-red-200 border">archived</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                      {p.deletedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Archived {format(new Date(p.deletedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  {canRestore && (
                    <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => setRestoreId(p.id)}>
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </Button>
                  )}
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

      {/* Restore Confirmation */}
      <Dialog open={!!restoreId} onOpenChange={(v) => !v && setRestoreId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Restore Patient?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This patient will be restored to the active patient list with all their medical records intact.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreId(null)}>إلغاء</Button>
            <Button onClick={() => restoreId && restoreMutation.mutate({ id: restoreId })} disabled={restoreMutation.isPending} className="gap-2">
              <RotateCcw className="w-4 h-4" /> {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
