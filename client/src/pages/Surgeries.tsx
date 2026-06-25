import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Stethoscope, Search, Calendar, User, Filter, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدولة",
  completed: "مكتملة",
  cancelled: "ملغاة",
  postponed: "مؤجلة",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  postponed: "bg-amber-100 text-amber-700 border-amber-200",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type FormState = {
  patientId: string;
  doctorId: string;
  surgeryTypeId: string;
  surgeryDate: string;
  notes: string;
  status: "scheduled" | "completed" | "cancelled" | "postponed";
};

const EMPTY_FORM: FormState = {
  patientId: "",
  doctorId: "",
  surgeryTypeId: "",
  surgeryDate: "",
  notes: "",
  status: "scheduled",
};

// ─── Standalone form component (outside Surgeries to avoid remount) ───────────
function SurgeryForm({
  form,
  setForm,
  patientList,
  doctors,
  surgeryTypes,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  patientList: any[];
  doctors: any[];
  surgeryTypes: any[];
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>المريض *</Label>
        <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
          <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
          <SelectContent>
            {patientList.length === 0 ? (
              <SelectItem value="_empty" disabled>لا يوجد مرضى</SelectItem>
            ) : patientList.map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.fullName} — {p.patientId}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>نوع العملية *</Label>
        <Select value={form.surgeryTypeId} onValueChange={(v) => setForm((f) => ({ ...f, surgeryTypeId: v }))}>
          <SelectTrigger><SelectValue placeholder="اختر نوع العملية" /></SelectTrigger>
          <SelectContent>
            {surgeryTypes.length === 0 ? (
              <SelectItem value="_empty" disabled>لا توجد أنواع — أضفها من الإعدادات</SelectItem>
            ) : surgeryTypes.map((t: any) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>الطبيب *</Label>
        <Select value={form.doctorId} onValueChange={(v) => setForm((f) => ({ ...f, doctorId: v }))}>
          <SelectTrigger><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
          <SelectContent>
            {doctors.length === 0 ? (
              <SelectItem value="_empty" disabled>لا يوجد أطباء — أضفهم من الإعدادات</SelectItem>
            ) : doctors.map((d: any) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>موعد العملية *</Label>
        <Input
          type="datetime-local"
          value={form.surgeryDate}
          onChange={(e) => setForm((f) => ({ ...f, surgeryDate: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>الحالة</Label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as FormState["status"] }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">مجدولة</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
            <SelectItem value="postponed">مؤجلة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>ملاحظات <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          placeholder="أي ملاحظات خاصة بالعملية..."
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Surgeries() {
  const utils = trpc.useUtils();

  const { data: surgeries, isLoading } = trpc.surgeries.list.useQuery();
  const { data: patients } = trpc.patients.list.useQuery({ page: 1, limit: 500 });
  const { data: doctors } = trpc.clinicDoctors.listAll.useQuery();
  const { data: surgeryTypes } = trpc.surgeryTypes.listAll.useQuery();

  const createMutation = trpc.surgeries.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة العملية الجراحية");
      utils.surgeries.list.invalidate();
      utils.surgeries.upcoming.invalidate();
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.surgeries.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث العملية");
      utils.surgeries.list.invalidate();
      utils.surgeries.upcoming.invalidate();
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.surgeries.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف العملية");
      utils.surgeries.list.invalidate();
      utils.surgeries.upcoming.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  const patientList: any[] = (patients as any)?.data ?? (patients as any)?.patients ?? [];
  const doctorList: any[] = (doctors as any) ?? [];
  const typeList: any[] = (surgeryTypes as any) ?? [];

  const openEdit = (s: any) => {
    setForm({
      patientId: String(s.patientId),
      doctorId: String(s.doctorId),
      surgeryTypeId: String(s.surgeryTypeId),
      surgeryDate: s.surgeryDate ? new Date(s.surgeryDate).toISOString().slice(0, 16) : "",
      notes: s.notes ?? "",
      status: s.status,
    });
    setEditId(s.id);
  };

  const handleCreate = () => {
    if (!form.patientId || !form.doctorId || !form.surgeryTypeId || !form.surgeryDate) {
      toast.error("يرجى تعبئة الحقول المطلوبة: المريض، نوع العملية، الطبيب، والموعد");
      return;
    }
    createMutation.mutate({
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId),
      surgeryTypeId: Number(form.surgeryTypeId),
      surgeryDate: new Date(form.surgeryDate),
      notes: form.notes || undefined,
      status: form.status,
    });
  };

  const handleUpdate = () => {
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      patientId: form.patientId ? Number(form.patientId) : undefined,
      doctorId: form.doctorId ? Number(form.doctorId) : undefined,
      surgeryTypeId: form.surgeryTypeId ? Number(form.surgeryTypeId) : undefined,
      surgeryDate: form.surgeryDate ? new Date(form.surgeryDate) : undefined,
      notes: form.notes || undefined,
      status: form.status,
    });
  };

  const filtered = (surgeries ?? []).filter((s: any) => {
    const matchSearch = !search ||
      (s.patientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.surgeryTypeName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.doctorName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" /> العمليات الجراحية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">جدولة وإدارة مواعيد العمليات الجراحية</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true); }}>
          <Plus className="w-4 h-4" /> إضافة عملية
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["scheduled", "completed", "cancelled", "postponed"] as const).map((st) => {
          const count = (surgeries ?? []).filter((s: any) => s.status === st).length;
          return (
            <Card key={st} className="cursor-pointer" onClick={() => setFilterStatus(filterStatus === st ? "all" : st)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{STATUS_LABELS[st]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالمريض أو العملية أو الطبيب..."
            className="pr-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <Filter className="w-3.5 h-3.5 ml-1" />
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="scheduled">مجدولة</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
            <SelectItem value="postponed">مؤجلة</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterStatus !== "all") && (
          <Button variant="ghost" size="sm" className="gap-1.5 h-9" onClick={() => { setSearch(""); setFilterStatus("all"); }}>
            <X className="w-3.5 h-3.5" /> مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">قائمة العمليات</CardTitle>
          <CardDescription>{filtered.length} عملية</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد عمليات</p>
              <p className="text-sm mt-1">اضغط "إضافة عملية" لجدولة أول عملية جراحية</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">المريض</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">نوع العملية</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الطبيب</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الموعد</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">ملاحظات</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{s.patientName ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{s.patientCode ?? ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-blue-700">{s.surgeryTypeName ?? "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.doctorName ?? "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{formatDate(s.surgeryDate)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[s.status] ?? ""}`}>
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <p className="text-xs text-muted-foreground truncate">{s.notes || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setForm({ ...EMPTY_FORM }); } }}>
        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" /> إضافة عملية جراحية
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SurgeryForm
              form={form}
              setForm={setForm}
              patientList={patientList}
              doctors={doctorList}
              surgeryTypes={typeList}
            />
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setForm({ ...EMPTY_FORM }); }}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة العملية"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={editId !== null} onOpenChange={(o) => { if (!o) setEditId(null); }}>
        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> تعديل العملية الجراحية
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SurgeryForm
              form={form}
              setForm={setForm}
              patientList={patientList}
              doctors={doctorList}
              surgeryTypes={typeList}
            />
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditId(null)}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العملية الجراحية</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
