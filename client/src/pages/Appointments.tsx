import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { APPT_STATUS_CLASSES, APPT_STATUS_LABELS } from "@/lib/types";

const EMPTY_FORM = { patientId: 0, doctorId: 0, appointmentDate: new Date().toISOString().slice(0, 16), duration: 30, reason: "", notes: "", status: "pending" as const };

export default function Appointments() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const { data, isLoading } = trpc.appointments.list.useQuery({ status: statusFilter || undefined, page, limit: 15 });
  const { data: patients } = trpc.patients.list.useQuery({ limit: 200 });
  const { data: doctors } = trpc.users.list.useQuery();
  const createMutation = trpc.appointments.create.useMutation({ onSuccess: () => { toast.success("Appointment scheduled"); utils.appointments.list.invalidate(); setShowForm(false); setForm({ ...EMPTY_FORM }); }, onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.appointments.update.useMutation({ onSuccess: () => { toast.success("Appointment updated"); utils.appointments.list.invalidate(); setShowForm(false); setEditId(null); }, onError: (e) => toast.error(e.message) });
  const deleteMutation = trpc.appointments.delete.useMutation({ onSuccess: () => { toast.success("Appointment deleted"); utils.appointments.list.invalidate(); setDeleteId(null); }, onError: (e) => toast.error(e.message) });
  const openCreate = () => { setForm({ ...EMPTY_FORM, doctorId: user?.id ?? 0 }); setEditId(null); setShowForm(true); };
  const openEdit = (a: any) => { setForm({ patientId: a.patientId, doctorId: a.doctorId, appointmentDate: format(new Date(a.appointmentDate), "yyyy-MM-dd'T'HH:mm"), duration: a.duration ?? 30, reason: a.reason ?? "", notes: a.notes ?? "", status: a.status }); setEditId(a.id); setShowForm(true); };
  const handleSubmit = () => { if (!form.patientId) { toast.error("Select a patient"); return; } if (!form.doctorId) { toast.error("Select a doctor"); return; } const payload = { patientId: form.patientId, doctorId: form.doctorId, appointmentDate: form.appointmentDate, duration: form.duration, reason: form.reason || undefined, notes: form.notes || undefined, status: form.status }; if (editId) updateMutation.mutate({ id: editId, ...payload }); else createMutation.mutate(payload); };
  const totalPages = Math.ceil((data?.total ?? 0) / 15);
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Appointments</h1><p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total appointments</p></div>
        <Button onClick={openCreate} size="sm" className="gap-2 h-9"><Plus className="w-4 h-4" /> Schedule</Button>
      </div>
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="no-show">No Show</SelectItem></SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : data?.data?.length === 0 ? <div className="text-center py-16 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No appointments found</p><Button onClick={openCreate} className="mt-4 gap-2" size="sm"><Plus className="w-4 h-4" /> Schedule</Button></div>
        : <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Doctor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data?.data?.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-medium">{(a as any).patientName ?? `Patient #${a.patientId}`}</p></td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{(a as any).doctorName ?? `Dr. #${a.doctorId}`}</td>
                    <td className="px-4 py-3"><p className="text-sm font-medium">{format(new Date(a.appointmentDate), "MMM d, yyyy")}</p><p className="text-xs text-muted-foreground">{format(new Date(a.appointmentDate), "h:mm a")}{a.duration ? ` · ${a.duration} min` : ""}</p></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground truncate max-w-40">{a.reason || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs border ${APPT_STATUS_CLASSES[a.status as keyof typeof APPT_STATUS_CLASSES] ?? ""}`}>{APPT_STATUS_LABELS[a.status as keyof typeof APPT_STATUS_LABELS] ?? a.status}</Badge></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-border"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1"><ChevronLeft className="w-3 h-3" /> Prev</Button><Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-8 gap-1">Next <ChevronRight className="w-3 h-3" /></Button></div></div>}
        </>}
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Appointment" : "Schedule Appointment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5"><Label>Patient *</Label><Select value={form.patientId.toString()} onValueChange={(v) => setForm({ ...form, patientId: parseInt(v) })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{patients?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Doctor *</Label><Select value={form.doctorId.toString()} onValueChange={(v) => setForm({ ...form, doctorId: parseInt(v) })}><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger><SelectContent>{doctors?.filter((d) => d.role === "doctor" || d.role === "admin").map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name ?? d.email ?? `User #${d.id}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Date & Time *</Label><Input type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" /></div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="no-show">No Show</SelectItem></SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? "Saving..." : editId ? "Update" : "Schedule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Appointment?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">This action cannot be undone.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting..." : "Delete"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
