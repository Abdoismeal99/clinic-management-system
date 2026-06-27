import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, User, Upload, Globe, Shield, Save, Camera, X, Plus, Pencil, Trash2, Stethoscope, Users } from "lucide-react";

const SETTING_KEYS = {
  clinicName: "clinic_name",
  clinicAddress: "clinic_address",
  clinicPhone: "clinic_phone",
  clinicEmail: "clinic_email",
  clinicLogo: "clinic_logo",
  doctorName: "doctor_name",
  doctorSpecialty: "doctor_specialty",
  doctorPhone: "doctor_phone",
  doctorEmail: "doctor_email",
  language: "language",
  timezone: "timezone",
  dateFormat: "date_format",
  currency: "currency",
  appointmentDuration: "appointment_duration",
  workingHoursStart: "working_hours_start",
  workingHoursEnd: "working_hours_end",
};

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: settingsData, isLoading } = trpc.settings.getAll.useQuery();
  const upsertManyMutation = trpc.settings.upsertMany.useMutation({
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); utils.settings.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const upsertMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => { toast.success("تم تحديث الشعار"); utils.settings.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadLogoMutation = trpc.settings.uploadLogo.useMutation({
    onSuccess: (data) => { setLogoPreview(data.url); toast.success("تم رفع الشعار بنجاح"); utils.settings.getAll.invalidate(); setLogoUploading(false); },
    onError: (e) => { toast.error(e.message); setLogoUploading(false); },
  });

  const [clinic, setClinic] = useState({ name: "", address: "", phone: "", email: "" });
  const [doctor, setDoctor] = useState({ name: "", specialty: "", phone: "", email: "" });
  const [prefs, setPrefs] = useState({ language: "ar", timezone: "Asia/Riyadh", dateFormat: "DD/MM/YYYY", currency: "SAR", appointmentDuration: "30", workingHoursStart: "09:00", workingHoursEnd: "17:00" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Profile editing state
  const [profile, setProfile] = useState({ name: user?.name ?? "", specialty: (user as any)?.specialty ?? "", phone: (user as any)?.phone ?? "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("تم حفظ بيانات حسابك");
      setProfileSaving(false);
    },
    onError: (e) => { toast.error(e.message); setProfileSaving(false); },
  });

  // Sync profile state when user loads
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name ?? "",
        specialty: (user as any).specialty ?? "",
        phone: (user as any).phone ?? "",
      });
    }
  }, [user?.id]);

  // Any logged-in user with a tenant (clinic) can edit their own clinic settings
  const SUPER_ADMIN_EMAIL = "abdoismeal012@gmail.com";
  const isAdmin = user?.role === "admin" || (user as any)?.tenantRole === "clinic_admin" || (user as any)?.tenantId != null || user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!settingsData) return;
    const get = (key: string) => settingsData.find((s: any) => s.key === key)?.value ?? "";
    setClinic({ name: get(SETTING_KEYS.clinicName), address: get(SETTING_KEYS.clinicAddress), phone: get(SETTING_KEYS.clinicPhone), email: get(SETTING_KEYS.clinicEmail) });
    setDoctor({ name: get(SETTING_KEYS.doctorName), specialty: get(SETTING_KEYS.doctorSpecialty), phone: get(SETTING_KEYS.doctorPhone), email: get(SETTING_KEYS.doctorEmail) });
    setPrefs({
      language: get(SETTING_KEYS.language) || "ar",
      timezone: get(SETTING_KEYS.timezone) || "Asia/Riyadh",
      dateFormat: get(SETTING_KEYS.dateFormat) || "DD/MM/YYYY",
      currency: get(SETTING_KEYS.currency) || "SAR",
      appointmentDuration: get(SETTING_KEYS.appointmentDuration) || "30",
      workingHoursStart: get(SETTING_KEYS.workingHoursStart) || "09:00",
      workingHoursEnd: get(SETTING_KEYS.workingHoursEnd) || "17:00",
    });
    const logo = get(SETTING_KEYS.clinicLogo);
    if (logo) setLogoPreview(logo);
  }, [settingsData]);

  const saveClinic = () => {
    upsertManyMutation.mutate([
      { key: SETTING_KEYS.clinicName, value: clinic.name },
      { key: SETTING_KEYS.clinicAddress, value: clinic.address },
      { key: SETTING_KEYS.clinicPhone, value: clinic.phone },
      { key: SETTING_KEYS.clinicEmail, value: clinic.email },
    ]);
  };

  const saveDoctor = () => {
    upsertManyMutation.mutate([
      { key: SETTING_KEYS.doctorName, value: doctor.name },
      { key: SETTING_KEYS.doctorSpecialty, value: doctor.specialty },
      { key: SETTING_KEYS.doctorPhone, value: doctor.phone },
      { key: SETTING_KEYS.doctorEmail, value: doctor.email },
    ]);
  };

  const savePrefs = () => {
    upsertManyMutation.mutate(Object.entries(prefs).map(([k, v]) => ({ key: (SETTING_KEYS as any)[k], value: v })));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار ملف صورة"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("يجب أن يكون الشعار أقل من 2 ميجابايت"); return; }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        // Show preview immediately while uploading
        setLogoPreview(dataUrl);
        // Extract base64 content (remove data:image/...;base64, prefix)
        const base64 = dataUrl.split(",")[1];
        uploadLogoMutation.mutate({ fileContent: base64, mimeType: file.type, fileName: file.name });
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
      toast.error("فشل رفع الشعار");
    }
  };

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><SettingsIcon className="w-6 h-6 text-primary" /> الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">إدارة معلومات العيادة والتفضيلات وإعدادات النظام</p>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>المسؤولون فقط يمكنهم تعديل الإعدادات. تواصل مع المسؤول لإجراء التغييرات.</span>
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="h-9 flex-wrap gap-1">
          <TabsTrigger value="profile" className="text-sm gap-1.5"><User className="w-3.5 h-3.5" /> حسابي</TabsTrigger>
          <TabsTrigger value="clinic" className="text-sm gap-1.5"><Building2 className="w-3.5 h-3.5" /> العيادة</TabsTrigger>
          <TabsTrigger value="doctor" className="text-sm gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> الطبيب الرئيسي</TabsTrigger>
          <TabsTrigger value="doctors" className="text-sm gap-1.5"><Users className="w-3.5 h-3.5" /> الأطباء</TabsTrigger>
          <TabsTrigger value="surgeryTypes" className="text-sm gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> أنواع العمليات</TabsTrigger>
          <TabsTrigger value="preferences" className="text-sm gap-1.5"><Globe className="w-3.5 h-3.5" /> التفضيلات</TabsTrigger>
        </TabsList>

        {/* My Profile */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> بيانات حسابي</CardTitle>
              <CardDescription>تعديل اسمك وتخصصك ورقم هاتفك الشخصي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>الاسم الكامل</Label>
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="اسمك الكامل" />
                </div>
                <div className="space-y-1.5">
                  <Label>التخصص</Label>
                  <Input value={profile.specialty} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} placeholder="مثال: طب عام، أسنان، عيون..." />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهاتف</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+966 5X XXX XXXX" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                  <Input value={user?.email ?? ""} disabled className="bg-muted/40" />
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني لا يمكن تغييره — مرتبط بحساب جوجل</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => { setProfileSaving(true); updateProfileMutation.mutate({ name: profile.name, specialty: profile.specialty, phone: profile.phone }); }}
                  disabled={profileSaving || updateProfileMutation.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {profileSaving || updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ بياناتي"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinic Settings */}
        <TabsContent value="clinic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> معلومات العيادة</CardTitle>
              <CardDescription>المعلومات الأساسية للعيادة التي تظهر في التقارير والوصفات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium">شعار العيادة</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="شعار العيادة" className="w-full h-full object-contain" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground opacity-40" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => logoInputRef.current?.click()} disabled={!isAdmin || logoUploading}>
                      <Upload className="w-3.5 h-3.5" />
                      {logoUploading ? "جاري الرفع..." : "رفع الشعار"}
                    </Button>
                    {logoPreview && (
                      <Button variant="ghost" size="sm" className="gap-2 h-8 text-destructive hover:text-destructive" onClick={() => { setLogoPreview(null); if (isAdmin) upsertMutation.mutate({ key: SETTING_KEYS.clinicLogo, value: "" }); }}>
                        <X className="w-3.5 h-3.5" /> حذف
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG, JPG حتى 2 ميجابايت. يُنصح: 200×200 بكسل</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>اسم العيادة</Label>
                  <Input value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} placeholder="مثال: مركز المدينة الطبي" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهاتف</Label>
                  <Input value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="+966 5X XXX XXXX" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={clinic.email} onChange={(e) => setClinic({ ...clinic, email: e.target.value })} placeholder="clinic@example.com" disabled={!isAdmin} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>العنوان</Label>
                  <Textarea value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} rows={2} placeholder="عنوان العيادة الكامل" disabled={!isAdmin} />
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={saveClinic} disabled={upsertManyMutation.isPending} className="gap-2">
                    <Save className="w-4 h-4" /> {upsertManyMutation.isPending ? "جاري الحفظ..." : "حفظ معلومات العيادة"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Primary Doctor Settings */}
        <TabsContent value="doctor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> معلومات الطبيب الرئيسي</CardTitle>
              <CardDescription>بيانات الطبيب التي تظهر في الوصفات والتقارير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>اسم الطبيب</Label>
                  <Input value={doctor.name} onChange={(e) => setDoctor({ ...doctor, name: e.target.value })} placeholder="د. محمد أحمد" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>التخصص</Label>
                  <Input value={doctor.specialty} onChange={(e) => setDoctor({ ...doctor, specialty: e.target.value })} placeholder="مثال: طب عام" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>الهاتف</Label>
                  <Input value={doctor.phone} onChange={(e) => setDoctor({ ...doctor, phone: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={doctor.email} onChange={(e) => setDoctor({ ...doctor, email: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={saveDoctor} disabled={upsertManyMutation.isPending} className="gap-2">
                    <Save className="w-4 h-4" /> {upsertManyMutation.isPending ? "جاري الحفظ..." : "حفظ معلومات الطبيب"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinic Doctors Management */}
        <TabsContent value="doctors" className="mt-4">
          <ClinicDoctorsTab isAdmin={isAdmin} />
        </TabsContent>

        {/* Surgery Types Management */}
        <TabsContent value="surgeryTypes" className="mt-4">
          <SurgeryTypesTab isAdmin={isAdmin} />
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> تفضيلات النظام</CardTitle>
              <CardDescription>اللغة والمنطقة الزمنية وتفضيلات العرض</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اللغة</Label>
                  <Select value={prefs.language} onValueChange={(v) => setPrefs({ ...prefs, language: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="tr">Türkçe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>المنطقة الزمنية</Label>
                  <Select value={prefs.timezone} onValueChange={(v) => setPrefs({ ...prefs, timezone: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Riyadh">الرياض (AST)</SelectItem>
                      <SelectItem value="Asia/Dubai">دبي (GST)</SelectItem>
                      <SelectItem value="Africa/Cairo">القاهرة (EET)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/Paris">باريس (CET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>تنسيق التاريخ</Label>
                  <Select value={prefs.dateFormat} onValueChange={(v) => setPrefs({ ...prefs, dateFormat: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>مدة الموعد الافتراضية (دقيقة)</Label>
                  <Select value={prefs.appointmentDuration} onValueChange={(v) => setPrefs({ ...prefs, appointmentDuration: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 دقيقة</SelectItem>
                      <SelectItem value="20">20 دقيقة</SelectItem>
                      <SelectItem value="30">30 دقيقة</SelectItem>
                      <SelectItem value="45">45 دقيقة</SelectItem>
                      <SelectItem value="60">60 دقيقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>بداية ساعات العمل</Label>
                  <Input type="time" value={prefs.workingHoursStart} onChange={(e) => setPrefs({ ...prefs, workingHoursStart: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>نهاية ساعات العمل</Label>
                  <Input type="time" value={prefs.workingHoursEnd} onChange={(e) => setPrefs({ ...prefs, workingHoursEnd: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={savePrefs} disabled={upsertManyMutation.isPending} className="gap-2">
                    <Save className="w-4 h-4" /> {upsertManyMutation.isPending ? "جاري الحفظ..." : "حفظ التفضيلات"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Clinic Doctors Tab ───────────────────────────────────────────────────────
function ClinicDoctorsTab({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const { data: doctors, isLoading } = trpc.clinicDoctors.listAll.useQuery();
  const createMutation = trpc.clinicDoctors.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة الطبيب"); utils.clinicDoctors.listAll.invalidate(); utils.clinicDoctors.list.invalidate(); setShowAdd(false); setForm({ name: "", specialty: "", phone: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.clinicDoctors.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث بيانات الطبيب"); utils.clinicDoctors.listAll.invalidate(); utils.clinicDoctors.list.invalidate(); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.clinicDoctors.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف الطبيب"); utils.clinicDoctors.listAll.invalidate(); utils.clinicDoctors.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", specialty: "", phone: "" });

  const openEdit = (d: any) => {
    setForm({ name: d.name, specialty: d.specialty ?? "", phone: d.phone ?? "" });
    setEditId(d.id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> قائمة الأطباء</CardTitle>
          <CardDescription>الأطباء المتاحون للاختيار عند جدولة العمليات الجراحية</CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => { setForm({ name: "", specialty: "", phone: "" }); setShowAdd(true); }}>
            <Plus className="w-3.5 h-3.5" /> إضافة طبيب
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : (doctors ?? []).length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا يوجد أطباء مضافون بعد</p>
            {isAdmin && <p className="text-xs mt-1">اضغط "إضافة طبيب" لإضافة أول طبيب</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {(doctors ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty || "—"} {d.phone ? `· ${d.phone}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.isActive ? "default" : "secondary"} className="text-xs">
                    {d.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>إضافة طبيب جديد</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>اسم الطبيب *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="د. محمد أحمد" />
            </div>
            <div className="space-y-1.5">
              <Label>التخصص</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="مثال: جراحة عامة" />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+966 5X XXX XXXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>تعديل بيانات الطبيب</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>اسم الطبيب *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>التخصص</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>إلغاء</Button>
            <Button onClick={() => editId && updateMutation.mutate({ id: editId, ...form })} disabled={!form.name.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطبيب</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الطبيب؟ لن يظهر في قائمة الأطباء المتاحة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Surgery Types Tab ────────────────────────────────────────────────────────
function SurgeryTypesTab({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const { data: types, isLoading } = trpc.surgeryTypes.listAll.useQuery();
  const createMutation = trpc.surgeryTypes.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة نوع العملية"); utils.surgeryTypes.listAll.invalidate(); utils.surgeryTypes.list.invalidate(); setShowAdd(false); setForm({ name: "", description: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.surgeryTypes.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث نوع العملية"); utils.surgeryTypes.listAll.invalidate(); utils.surgeryTypes.list.invalidate(); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.surgeryTypes.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف نوع العملية"); utils.surgeryTypes.listAll.invalidate(); utils.surgeryTypes.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const openEdit = (t: any) => {
    setForm({ name: t.name, description: t.description ?? "" });
    setEditId(t.id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /> أنواع العمليات الجراحية</CardTitle>
          <CardDescription>قائمة أنواع العمليات المتاحة عند جدولة عملية جراحية</CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => { setForm({ name: "", description: "" }); setShowAdd(true); }}>
            <Plus className="w-3.5 h-3.5" /> إضافة نوع عملية
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : (types ?? []).length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد أنواع عمليات مضافة بعد</p>
            {isAdmin && <p className="text-xs mt-1">اضغط "إضافة نوع عملية" لإضافة أول نوع</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {(types ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.isActive ? "default" : "secondary"} className="text-xs">
                    {t.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>إضافة نوع عملية جراحية</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>اسم العملية *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: استئصال الزائدة الدودية" />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف (اختياري)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="وصف مختصر للعملية" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>تعديل نوع العملية</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>اسم العملية *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>إلغاء</Button>
            <Button onClick={() => editId && updateMutation.mutate({ id: editId, ...form })} disabled={!form.name.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نوع العملية</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا النوع؟ لن يظهر عند جدولة العمليات.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
