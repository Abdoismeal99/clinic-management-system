import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus, Copy, RefreshCw, Trash2, Edit, ShieldOff, ShieldCheck,
  Clock, CheckCircle, XCircle, AlertCircle, Users, Link as LinkIcon,
} from "lucide-react";

const ADMIN_EMAIL = "abdoismeal012@gmail.com";

const PLAN_LABELS: Record<string, string> = {
  demo: "تجريبي (48 ساعة)",
  monthly: "شهري",
  quarterly: "3 شهور",
  yearly: "سنوي",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "في الانتظار", color: "bg-yellow-100 text-yellow-800 border-yellow-200",   icon: Clock },
  active:    { label: "نشط",          color: "bg-green-100 text-green-800 border-green-200",      icon: CheckCircle },
  expired:   { label: "منتهي",        color: "bg-red-100 text-red-800 border-red-200",            icon: XCircle },
  suspended: { label: "موقوف",        color: "bg-gray-100 text-gray-700 border-gray-200",         icon: ShieldOff },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildActivationLink(token: string) {
  return `${window.location.origin}/activate?token=${token}`;
}

type Tenant = {
  id: number;
  clinicName: string;
  email: string;
  phone?: string | null;
  plan: string;
  status: string;
  activationToken?: string | null;
  activatedAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
};

export default function AdminClients() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const { data: clients = [], refetch } = trpc.tenants.list.useQuery(undefined, { enabled: !!isAdmin });

  const [showAdd, setShowAdd] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [form, setForm] = useState({ clinicName: "", email: "", phone: "", plan: "demo" as const, notes: "" });
  const [editForm, setEditForm] = useState({ clinicName: "", phone: "", plan: "demo" as "demo"|"monthly"|"quarterly"|"yearly", status: "active" as any, notes: "", extendFromNow: false });

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: (data) => {
      const link = buildActivationLink(data.token);
      setNewLink(link);
      setShowAdd(false);
      setForm({ clinicName: "", email: "", phone: "", plan: "demo", notes: "" });
      refetch();
      toast.success("تم إضافة العميل بنجاح!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => { setEditTenant(null); refetch(); toast.success("تم التحديث بنجاح"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("تم الحذف"); },
    onError: (e) => toast.error(e.message),
  });

  const regenMutation = trpc.tenants.regenerateToken.useMutation({
    onSuccess: (data) => {
      const link = buildActivationLink(data.token);
      setNewLink(link);
      refetch();
      toast.success("تم توليد رابط جديد");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => toast.success("تم نسخ الرابط"));
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">غير مصرح بالوصول</h2>
        <p className="text-muted-foreground text-sm">هذه الصفحة مخصصة لمدير النظام فقط.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">إدارة العملاء</h1>
            <p className="text-xs text-muted-foreground">{clients.length} عميل مسجل</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة عميل جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = clients.filter((c: Tenant) => c.status === key).length;
          return (
            <div key={key} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground">{cfg.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-right">العيادة</TableHead>
              <TableHead className="text-right">الإيميل</TableHead>
              <TableHead className="text-right">الخطة</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  لا يوجد عملاء بعد — أضف أول عميل الآن
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c: Tenant) => (
                <TableRow key={c.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium text-foreground">{c.clinicName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">{PLAN_LABELS[c.plan] ?? c.plan}</span>
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.expiresAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Copy activation link */}
                      {c.activationToken && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="نسخ رابط التفعيل"
                          onClick={() => copyLink(buildActivationLink(c.activationToken!))}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {/* Regenerate link */}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="توليد رابط جديد"
                        onClick={() => regenMutation.mutate({ id: c.id })}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      {/* Edit */}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="تعديل"
                        onClick={() => {
                          setEditTenant(c);
                          setEditForm({
                            clinicName: c.clinicName,
                            phone: c.phone ?? "",
                            plan: c.plan as any,
                            status: c.status as any,
                            notes: c.notes ?? "",
                            extendFromNow: false,
                          });
                        }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      {/* Delete */}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="حذف"
                        onClick={() => { if (confirm("هل أنت متأكد من حذف هذا العميل؟")) deleteMutation.mutate({ id: c.id }); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم العيادة *</Label>
              <Input placeholder="مثال: عيادة الدكتور أحمد" value={form.clinicName}
                onChange={e => setForm(f => ({ ...f, clinicName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الإيميل *</Label>
              <Input type="email" placeholder="doctor@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف (اختياري)</Label>
              <Input placeholder="01xxxxxxxxx" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع الاشتراك *</Label>
              <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">تجريبي (48 ساعة)</SelectItem>
                  <SelectItem value="monthly">شهري (30 يوم)</SelectItem>
                  <SelectItem value="quarterly">3 شهور (90 يوم)</SelectItem>
                  <SelectItem value="yearly">سنوي (365 يوم)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea placeholder="أي ملاحظات..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.clinicName || !form.email}>
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة وتوليد رابط"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editTenant} onOpenChange={() => setEditTenant(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم العيادة</Label>
              <Input value={editForm.clinicName} onChange={e => setEditForm(f => ({ ...f, clinicName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تمديد الاشتراك</Label>
              <Select value={editForm.plan} onValueChange={v => setEditForm(f => ({ ...f, plan: v as any, extendFromNow: true }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">تجريبي (48 ساعة) من الآن</SelectItem>
                  <SelectItem value="monthly">شهري (30 يوم) من الآن</SelectItem>
                  <SelectItem value="quarterly">3 شهور (90 يوم) من الآن</SelectItem>
                  <SelectItem value="yearly">سنوي (365 يوم) من الآن</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">اختيار خطة سيمدد الاشتراك من الآن</p>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTenant(null)}>إلغاء</Button>
            <Button onClick={() => updateMutation.mutate({ id: editTenant!.id, ...editForm })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Activation Link Dialog */}
      <Dialog open={!!newLink} onOpenChange={() => setNewLink(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" /> رابط التفعيل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">ابعت الرابط ده للعميل عشان يفعّل حسابه. صلاحية الرابط 7 أيام.</p>
            <div className="bg-muted rounded-lg p-3 break-all text-sm font-mono text-foreground">
              {newLink}
            </div>
            <Button className="w-full gap-2" onClick={() => copyLink(newLink!)}>
              <Copy className="w-4 h-4" /> نسخ الرابط
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLink(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
