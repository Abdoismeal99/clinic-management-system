import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
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
import { Calendar, List, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from "date-fns";
import { APPT_STATUS_CLASSES, APPT_STATUS_LABELS } from "@/lib/types";

const EMPTY_FORM = { patientId: 0, doctorId: 0, appointmentDate: new Date().toISOString().slice(0, 16), duration: 30, reason: "", notes: "", status: "pending" as const };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Appointments() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const { data, isLoading } = trpc.appointments.list.useQuery({ status: statusFilter || undefined, page, limit: 15 });
  const { data: calendarData } = trpc.appointments.list.useQuery({ limit: 500, page: 1 }, { enabled: viewMode === "calendar" });
  const calendarStart = useMemo(() => startOfMonth(calendarMonth), [calendarMonth]);
  const calendarDays = useMemo(() => eachDayOfInterval({ start: calendarStart, end: endOfMonth(calendarMonth) }), [calendarStart, calendarMonth]);
  const firstDayOfWeek = useMemo(() => getDay(calendarStart), [calendarStart]);
  const getApptForDay = (day: Date) => (calendarData?.data ?? []).filter((a: any) => isSameDay(new Date(a.appointmentDate), day));
  const selectedDayAppts = selectedDay ? getApptForDay(selectedDay) : [];
  const { data: patients } = trpc.patients.list.useQuery({ limit: 200 });
  const { data: doctors } = trpc.users.list.useQuery();
  const createMutation = trpc.appointments.create.useMutation({ onSuccess: () => { toast.success("Appointment scheduled"); utils.appointments.list.invalidate(); setShowForm(false); setForm({ ...EMPTY_FORM }); }, onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.appointments.update.useMutation({ onSuccess: () => { toast.success("Appointment updated"); utils.appointments.list.invalidate(); setShowForm(false); setEditId(null); }, onError: (e) => toast.error(e.message) });
  const deleteMutation = trpc.appointments.delete.useMutation({ onSuccess: () => { toast.success("Appointment deleted"); utils.appointments.list.invalidate(); setDeleteId(null); }, onError: (e) => toast.error(e.message) });
  const openCreate = (date?: Date) => { const dt = date ? new Date(date) : new Date(); dt.setHours(9, 0, 0, 0); setForm({ ...EMPTY_FORM, doctorId: user?.id ?? 0, appointmentDate: dt.toISOString().slice(0, 16) }); setEditId(null); setShowForm(true); };
  const openEdit = (a: any) => { setForm({ patientId: a.patientId, doctorId: a.doctorId, appointmentDate: format(new Date(a.appointmentDate), "yyyy-MM-dd'T'HH:mm"), duration: a.duration ?? 30, reason: a.reason ?? "", notes: a.notes ?? "", status: a.status }); setEditId(a.id); setShowForm(true); };
  const handleSubmit = () => { if (!form.patientId) { toast.error("Select a patient"); return; } if (!form.doctorId) { toast.error("Select a doctor"); return; } const payload = { patientId: form.patientId, doctorId: form.doctorId, appointmentDate: form.appointmentDate, duration: form.duration, reason: form.reason || undefined, notes: form.notes || undefined, status: form.status }; if (editId) updateMutation.mutate({ id: editId, ...payload }); else createMutation.mutate(payload); };
  const totalPages = Math.ceil((data?.total ?? 0) / 15);
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">المواعيد</h1><p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total appointments</p></div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><List className="w-3.5 h-3.5" /> List</button>
            <button onClick={() => setViewMode("calendar")} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Calendar className="w-3.5 h-3.5" /> Calendar</button>
          </div>
          <Button onClick={() => openCreate()} size="sm" className="gap-2 h-9"><Plus className="w-4 h-4" /> Schedule</Button>
        </div>
      </div>
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                  <h2 className="text-base font-semibold">{format(calendarMonth, "MMMM yyyy")}</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-7 mb-2">{WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {[...Array(firstDayOfWeek)].map((_, i) => <div key={`e${i}`} className="bg-muted/20 min-h-[80px]" />)}
                  {calendarDays.map((day) => {
                    const appts = getApptForDay(day);
                    const isSel = selectedDay && isSameDay(day, selectedDay);
                    return (
                      <div key={day.toISOString()} onClick={() => setSelectedDay(day)} className={`bg-card min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${isSel ? "ring-2 ring-inset ring-primary" : ""} ${isToday(day) ? "bg-primary/5" : ""}`}>
                        <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}>{format(day, "d")}</div>
                        {appts.slice(0, 2).map((a: any) => <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded truncate mb-0.5 ${a.status === "completed" ? "bg-green-100 text-green-800" : a.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>{format(new Date(a.appointmentDate), "h:mma")} {a.patientName ?? "Pt"}</div>)}
                        {appts.length > 2 && <div className="text-[10px] text-muted-foreground px-1">+{appts.length - 2} more</div>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                {selectedDay ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">{format(selectedDay, "EEEE, MMM d")}</h3>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openCreate(selectedDay)}><Plus className="w-3 h-3" /> Add</Button>
                    </div>
                    {selectedDayAppts.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center"><Clock className="w-8 h-8 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">لا توجد مواعيد</p></div>
                    ) : (
                      <div className="space-y-2">{selectedDayAppts.map((a: any) => (
                        <div key={a.id} className="p-3 rounded-lg border border-border bg-muted/20">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.patientName ?? `Patient #${a.patientId}`}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(a.appointmentDate), "h:mm a")} · {a.duration ?? 30} min</p>
                              {a.reason && <p className="text-xs text-muted-foreground truncate">{a.reason}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge className={`text-[10px] border ${APPT_STATUS_CLASSES[a.status as keyof typeof APPT_STATUS_CLASSES] ?? ""}`}>{APPT_STATUS_LABELS[a.status as keyof typeof APPT_STATUS_LABELS] ?? a.status}</Badge>
                              <div className="flex gap-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(a)}><Pencil className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center"><Calendar className="w-10 h-10 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">Select a day to view appointments</p></div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {viewMode === "list" && <>
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">قيد الانتظار</SelectItem><SelectItem value="completed">مكتمل</SelectItem><SelectItem value="cancelled">ملغى</SelectItem><SelectItem value="no-show">No Show</SelectItem></SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : data?.data?.length === 0 ? <div className="text-center py-16 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No appointments found</p><Button onClick={() => openCreate()} className="mt-4 gap-2" size="sm"><Plus className="w-4 h-4" /> Schedule</Button></div>
        : <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">المريض</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">الطبيب</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">السبب</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">الإجراءات</th>
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

      </> }
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Appointment" : "Schedule Appointment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5"><Label>Patient *</Label><Select value={form.patientId.toString()} onValueChange={(v) => setForm({ ...form, patientId: parseInt(v) })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{patients?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Doctor *</Label><Select value={form.doctorId.toString()} onValueChange={(v) => setForm({ ...form, doctorId: parseInt(v) })}><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger><SelectContent>{doctors?.filter((d) => d.role === "doctor" || d.role === "admin").map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name ?? d.email ?? `User #${d.id}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Date & Time *</Label><Input type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>السبب</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" /></div>
            <div className="space-y-1.5"><Label>الحالة</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">قيد الانتظار</SelectItem><SelectItem value="completed">مكتمل</SelectItem><SelectItem value="cancelled">ملغى</SelectItem><SelectItem value="no-show">No Show</SelectItem></SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>الملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button><Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : editId ? "Update" : "Schedule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}><DialogContent aria-describedby={undefined} className="max-w-sm"><DialogHeader><DialogTitle>حذف الموعد؟</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">لا يمكن التراجع عن هذا الإجراء.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button><Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "جاري الحذف..." : "Delete"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
