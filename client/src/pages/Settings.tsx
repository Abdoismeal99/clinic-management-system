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
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, User, Upload, Globe, Bell, Shield, Save, Camera, X } from "lucide-react";

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
  enableNotifications: "enable_notifications",
  followUpReminders: "follow_up_reminders",
};

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: settingsData, isLoading } = trpc.settings.getAll.useQuery();
  const upsertManyMutation = trpc.settings.upsertMany.useMutation({
    onSuccess: () => { toast.success("Settings saved"); utils.settings.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const upsertMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => { toast.success("Logo updated"); utils.settings.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [clinic, setClinic] = useState({ name: "", address: "", phone: "", email: "" });
  const [doctor, setDoctor] = useState({ name: "", specialty: "", phone: "", email: "" });
  const [prefs, setPrefs] = useState({ language: "en", timezone: "UTC", dateFormat: "MM/DD/YYYY", currency: "USD", appointmentDuration: "30", workingHoursStart: "09:00", workingHoursEnd: "17:00" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const isAdmin = user?.role === "admin";

  // Populate form from settings
  useEffect(() => {
    if (!settingsData) return;
    const get = (key: string) => settingsData.find((s: any) => s.key === key)?.value ?? "";
    setClinic({ name: get(SETTING_KEYS.clinicName), address: get(SETTING_KEYS.clinicAddress), phone: get(SETTING_KEYS.clinicPhone), email: get(SETTING_KEYS.clinicEmail) });
    setDoctor({ name: get(SETTING_KEYS.doctorName), specialty: get(SETTING_KEYS.doctorSpecialty), phone: get(SETTING_KEYS.doctorPhone), email: get(SETTING_KEYS.doctorEmail) });
    setPrefs({
      language: get(SETTING_KEYS.language) || "en",
      timezone: get(SETTING_KEYS.timezone) || "UTC",
      dateFormat: get(SETTING_KEYS.dateFormat) || "MM/DD/YYYY",
      currency: get(SETTING_KEYS.currency) || "USD",
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
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        setLogoPreview(dataUrl);
        // Store as data URL in settings (for small logos)
        await upsertMutation.mutateAsync({ key: SETTING_KEYS.clinicLogo, value: dataUrl });
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
      toast.error("Failed to upload logo");
    }
  };

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><SettingsIcon className="w-6 h-6 text-primary" /> Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage clinic information, preferences, and system settings</p>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Only administrators can modify settings. Contact your admin to make changes.</span>
        </div>
      )}

      <Tabs defaultValue="clinic">
        <TabsList className="h-9">
          <TabsTrigger value="clinic" className="text-sm gap-1.5"><Building2 className="w-3.5 h-3.5" /> Clinic</TabsTrigger>
          <TabsTrigger value="doctor" className="text-sm gap-1.5"><User className="w-3.5 h-3.5" /> Doctor</TabsTrigger>
          <TabsTrigger value="preferences" className="text-sm gap-1.5"><Globe className="w-3.5 h-3.5" /> Preferences</TabsTrigger>
        </TabsList>

        {/* Clinic Settings */}
        <TabsContent value="clinic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Clinic Information</CardTitle>
              <CardDescription>Basic information about your clinic displayed on reports and prescriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">شعار العيادة</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Clinic logo" className="w-full h-full object-contain" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground opacity-40" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => logoInputRef.current?.click()} disabled={!isAdmin || logoUploading}>
                      <Upload className="w-3.5 h-3.5" />
                      {logoUploading ? "Uploading..." : "Upload Logo"}
                    </Button>
                    {logoPreview && (
                      <Button variant="ghost" size="sm" className="gap-2 h-8 text-destructive hover:text-destructive" onClick={() => { setLogoPreview(null); if (isAdmin) upsertMutation.mutate({ key: SETTING_KEYS.clinicLogo, value: "" }); }}>
                        <X className="w-3.5 h-3.5" /> Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB. Recommended: 200×200px</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>اسم العيادة</Label>
                  <Input value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} placeholder="e.g. City Medical Center" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="+1 (555) 000-0000" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" value={clinic.email} onChange={(e) => setClinic({ ...clinic, email: e.target.value })} placeholder="clinic@example.com" disabled={!isAdmin} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>العنوان</Label>
                  <Textarea value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} rows={2} placeholder="Full clinic address" disabled={!isAdmin} />
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={saveClinic} disabled={upsertManyMutation.isPending} className="gap-2">
                    <Save className="w-4 h-4" /> {upsertManyMutation.isPending ? "جاري الحفظ..." : "Save Clinic Info"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor Settings */}
        <TabsContent value="doctor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Primary Doctor Information</CardTitle>
              <CardDescription>Doctor details shown on prescriptions and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>اسم الطبيب</Label>
                  <Input value={doctor.name} onChange={(e) => setDoctor({ ...doctor, name: e.target.value })} placeholder="Dr. John Smith" disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>التخصص</Label>
                  <Input value={doctor.specialty} onChange={(e) => setDoctor({ ...doctor, specialty: e.target.value })} placeholder="e.g. General Practice" disabled={!isAdmin} />
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
                    <Save className="w-4 h-4" /> {upsertManyMutation.isPending ? "جاري الحفظ..." : "Save Doctor Info"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> System Preferences</CardTitle>
              <CardDescription>Language, timezone, and display preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اللغة</Label>
                  <Select value={prefs.language} onValueChange={(v) => setPrefs({ ...prefs, language: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic (العربية)</SelectItem>
                      <SelectItem value="fr">French (Français)</SelectItem>
                      <SelectItem value="es">Spanish (Español)</SelectItem>
                      <SelectItem value="de">German (Deutsch)</SelectItem>
                      <SelectItem value="tr">Turkish (Türkçe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={prefs.timezone} onValueChange={(v) => setPrefs({ ...prefs, timezone: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                      <SelectItem value="Asia/Riyadh">Riyadh (AST)</SelectItem>
                      <SelectItem value="Asia/Karachi">Karachi (PKT)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date Format</Label>
                  <Select value={prefs.dateFormat} onValueChange={(v) => setPrefs({ ...prefs, dateFormat: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Default Appointment Duration (min)</Label>
                  <Select value={prefs.appointmentDuration} onValueChange={(v) => setPrefs({ ...prefs, appointmentDuration: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Working Hours Start</Label>
                  <Input type="time" value={prefs.workingHoursStart} onChange={(e) => setPrefs({ ...prefs, workingHoursStart: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-1.5">
                  <Label>Working Hours End</Label>
                  <Input type="time" value={prefs.workingHoursEnd} onChange={(e) => setPrefs({ ...prefs, workingHoursEnd: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={savePrefs} disabled={upsertManyMutation.isPending} className="gap-2">
                    <Save className="w-4 h-4" /> {upsertManyMutation.isPending ? "جاري الحفظ..." : "Save Preferences"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Settings Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Configuration</CardTitle>
              <CardDescription>All saved settings at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              {settingsData && settingsData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {settingsData.filter((s: any) => s.key !== SETTING_KEYS.clinicLogo && s.value).map((s: any) => (
                    <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground capitalize">{s.key.replace(/_/g, " ")}</span>
                      <Badge variant="secondary" className="text-xs max-w-[140px] truncate">{s.value}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No settings configured yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
