import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Plus, Search, Eye, Pencil, Trash2, Archive, ChevronLeft, ChevronRight, Tag, X } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { STATUS_CLASSES, BLOOD_TYPES, canManagePatients, canDelete } from "@/lib/types";
import TagInput from "@/components/TagInput";

const STATUS_LABELS_AR: Record<string, string> = {
  new: "جديد", "follow-up": "متابعة", stable: "مستقر", critical: "حرج",
};
const GENDER_LABELS_AR: Record<string, string> = {
  male: "ذكر", female: "أنثى", other: "آخر",
};
const EMPTY_FORM = {
  fullName: "", gender: "male" as const, dateOfBirth: "", phone: "",
  address: "", occupation: "", bloodType: "unknown" as const,
  allergies: "", chronicDiseases: "", emergencyContactName: "",
  emergencyContactPhone: "", emergencyContactRelation: "",
  medicalNotes: "", tags: [] as string[], status: "new" as const,
};

export default function Patients() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = trpc.patients.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    gender: genderFilter !== "all" ? genderFilter : undefined,
    tag: tagFilter || undefined,
    page, limit: 15,
  });

  const createMutation = trpc.patients.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء المريض بنجاح"); utils.patients.list.invalidate(); setShowForm(false); setForm({ ...EMPTY_FORM }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.patients.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث بيانات المريض"); utils.patients.list.invalidate(); setShowForm(false); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.patients.delete.useMutation({
    onSuccess: () => { toast.success("تم أرشفة المريض"); utils.patients.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const parseTags = (raw: any): string[] => { try { return JSON.parse(raw || "[]"); } catch { return []; } };
  const openCreate = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };
  const openEdit = (p: any) => {
    setForm({
      fullName: p.fullName, gender: p.gender,
      dateOfBirth: p.dateOfBirth ? format(new Date(p.dateOfBirth), "yyyy-MM-dd") : "",
      phone: p.phone ?? "", address: p.address ?? "", occupation: p.occupation ?? "",
      bloodType: p.bloodType ?? "unknown", allergies: p.allergies ?? "",
      chronicDiseases: p.chronicDiseases ?? "", emergencyContactName: p.emergencyContactName ?? "",
      emergencyContactPhone: p.emergencyContactPhone ?? "",
      emergencyContactRelation: p.emergencyContactRelation ?? "",
      medicalNotes: p.medicalNotes ?? "", tags: parseTags(p.tags), status: p.status,
    });
    setEditId(p.id); setShowForm(true);
  };
  const handleSubmit = () => {
    if (!form.fullName.trim()) { toast.error("الاسم الكامل مطلوب"); return; }
    if (editId) updateMutation.mutate({ id: editId, ...form });
    else createMutation.mutate(form);
  };

  const role = user?.role ?? "user";
  const totalPages = Math.ceil((data?.total ?? 0) / 15);
  const allTags = Array.from(new Set((data?.data ?? []).flatMap(p => parseTags(p.tags))));

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المرضى</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} مريض إجمالاً</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/patients/archive">
            <Button variant="outline" size="sm" className="gap-2 h-9"><Archive className="w-4 h-4" /> الأرشيف</Button>
          </Link>
          {canManagePatients(role as any) && (
            <Button onClick={openCreate} size="sm" className="gap-2 h-9"><Plus className="w-4 h-4" /> مريض جديد</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم، رقم المريض، الهاتف..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pr-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="new">جديد</SelectItem>
                <SelectItem value="follow-up">متابعة</SelectItem>
                <SelectItem value="stable">مستقر</SelectItem>
                <SelectItem value="critical">حرج</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={v => { setGenderFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="الجنس" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="male">ذكر</SelectItem>
                <SelectItem value="female">أنثى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">فلتر بالتاج:</span>
              {tagFilter && (
                <Badge variant="default" className="gap-1 cursor-pointer text-xs" onClick={() => { setTagFilter(""); setPage(1); }}>
                  {tagFilter} <X className="w-3 h-3" />
                </Badge>
              )}
              {allTags.filter(t => t !== tagFilter).map(tag => (
                <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-accent text-xs transition-colors" onClick={() => { setTagFilter(tag); setPage(1); }}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data?.data.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">لا يوجد مرضى</p>
              <p className="text-xs mt-1">ابدأ بإضافة مريض جديد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                    <th className="text-right px-4 py-3 font-medium">المريض</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">رقم المريض</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">الجنس / العمر</th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">الهاتف</th>
                    <th className="text-right px-4 py-3 font-medium">التاجات</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.data.map(p => {
                    const tags = parseTags(p.tags);
                    const age = p.dateOfBirth ? differenceInYears(new Date(), new Date(p.dateOfBirth)) : null;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                              {p.fullName.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{p.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground font-mono text-xs">{p.patientId}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          {GENDER_LABELS_AR[p.gender] ?? p.gender}{age !== null ? ` · ${age} سنة` : ""}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.phone ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 cursor-pointer hover:bg-primary/10" onClick={() => { setTagFilter(tag); setPage(1); }}>
                                {tag}
                              </Badge>
                            ))}
                            {tags.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0">+{tags.length - 3}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${STATUS_CLASSES[p.status as keyof typeof STATUS_CLASSES] ?? ""}`}>
                            {STATUS_LABELS_AR[p.status] ?? p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/patients/${p.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                            </Link>
                            {canManagePatients(role as any) && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                            )}
                            {canDelete(role as any) && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1">
                  <ChevronRight className="w-3 h-3" /> السابق
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 gap-1">
                  التالي <ChevronLeft className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editId ? "تعديل بيانات المريض" : "إضافة مريض جديد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2" dir="rtl">
            <div className="sm:col-span-2 space-y-1.5"><Label>الاسم الكامل *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="أدخل الاسم الكامل" /></div>
            <div className="space-y-1.5"><Label>الجنس *</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem><SelectItem value="other">آخر</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>تاريخ الميلاد</Label><Input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>رقم الهاتف</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" /></div>
            <div className="space-y-1.5"><Label>المهنة</Label><Input value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>فصيلة الدم</Label>
              <Select value={form.bloodType} onValueChange={v => setForm({ ...form, bloodType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt === "unknown" ? "غير معروف" : bt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="new">جديد</SelectItem><SelectItem value="follow-up">متابعة</SelectItem><SelectItem value="stable">مستقر</SelectItem><SelectItem value="critical">حرج</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5"><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>الحساسيات</Label><Input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="مثال: البنسلين" /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>الأمراض المزمنة</Label><Input value={form.chronicDiseases} onChange={e => setForm({ ...form, chronicDiseases: e.target.value })} placeholder="مثال: السكري، ضغط الدم" /></div>
            <div className="space-y-1.5"><Label>جهة الاتصال الطارئة</Label><Input value={form.emergencyContactName} onChange={e => setForm({ ...form, emergencyContactName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>هاتف الطوارئ</Label><Input value={form.emergencyContactPhone} onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>صلة القرابة</Label><Input value={form.emergencyContactRelation} onChange={e => setForm({ ...form, emergencyContactRelation: e.target.value })} placeholder="مثال: زوج/زوجة" /></div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> التاجات</Label>
              <TagInput value={form.tags} onChange={tags => setForm({ ...form, tags })} placeholder="أضف تاج (مثال: سكري، ضغط)..." />
              <p className="text-xs text-muted-foreground">اضغط Enter أو فاصلة لإضافة تاج جديد</p>
            </div>
            <div className="sm:col-span-2 space-y-1.5"><Label>ملاحظات طبية</Label><Textarea value={form.medicalNotes} onChange={e => setForm({ ...form, medicalNotes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "جارٍ الحفظ..." : editId ? "تحديث" : "إنشاء المريض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm" aria-describedby="archive-desc">
          <DialogHeader><DialogTitle>أرشفة المريض؟</DialogTitle><DialogDescription id="archive-desc">سيتم نقل هذا المريض إلى الأرشيف. يمكنك استعادته لاحقاً.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "جارٍ الأرشفة..." : "أرشفة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
