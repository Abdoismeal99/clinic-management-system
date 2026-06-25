import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, User, Save } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicWebsite, setClinicWebsite] = useState("");
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
  const [profileSpecialty, setProfileSpecialty] = useState((user as any)?.specialty ?? "");
  const [profilePhone, setProfilePhone] = useState((user as any)?.phone ?? "");
  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setClinicName(map["clinic_name"] ?? "");
      setClinicAddress(map["clinic_address"] ?? "");
      setClinicPhone(map["clinic_phone"] ?? "");
      setClinicEmail(map["clinic_email"] ?? "");
      setClinicWebsite(map["clinic_website"] ?? "");
    }
  }, [settings]);
  useEffect(() => { if (user) { setProfileName(user.name ?? ""); setProfileEmail(user.email ?? ""); } }, [user]);
  const upsertManyMutation = trpc.settings.upsertMany.useMutation({ onSuccess: () => { toast.success("Clinic settings saved"); utils.settings.getAll.invalidate(); }, onError: (e) => toast.error(e.message) });
  const updateProfileMutation = trpc.users.updateProfile.useMutation({ onSuccess: () => toast.success("Profile updated"), onError: (e) => toast.error(e.message) });
  const isAdmin = user?.role === "admin";
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div><h1 className="text-2xl font-bold text-foreground">Settings</h1><p className="text-sm text-muted-foreground mt-0.5">Manage clinic and profile settings</p></div>
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Clinic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Clinic Name</Label><Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="My Clinic" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} placeholder="+1 234 567 8900" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} placeholder="clinic@example.com" /></div>
              <div className="space-y-1.5"><Label>Website</Label><Input value={clinicWebsite} onChange={(e) => setClinicWebsite(e.target.value)} placeholder="https://myclinic.com" /></div>
              <div className="sm:col-span-2 space-y-1.5"><Label>Address</Label><Textarea value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} rows={2} placeholder="123 Medical Street, City, Country" /></div>
            </div>
            <Button onClick={() => upsertManyMutation.mutate([{ key: "clinic_name", value: clinicName }, { key: "clinic_address", value: clinicAddress }, { key: "clinic_phone", value: clinicPhone }, { key: "clinic_email", value: clinicEmail }, { key: "clinic_website", value: clinicWebsite }])} disabled={upsertManyMutation.isPending} className="gap-2"><Save className="w-4 h-4" />{upsertManyMutation.isPending ? "Saving..." : "Save Clinic Settings"}</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> My Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Full Name</Label><Input value={profileName} onChange={(e) => setProfileName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Specialty</Label><Input value={profileSpecialty} onChange={(e) => setProfileSpecialty(e.target.value)} placeholder="e.g. General Practitioner" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} /></div>
          </div>
          <Button onClick={() => updateProfileMutation.mutate({ name: profileName, email: profileEmail, specialty: profileSpecialty, phone: profilePhone })} disabled={updateProfileMutation.isPending} className="gap-2"><Save className="w-4 h-4" />{updateProfileMutation.isPending ? "Saving..." : "Save Profile"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
