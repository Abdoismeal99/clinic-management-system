import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Edit, Printer, Heart, Thermometer, Activity, Calendar, Clock, User, FileText, Pill, ChevronRight, CheckCircle2, AlertCircle, Wind, Droplets } from "lucide-react";
import { format } from "date-fns";

const VISIT_STATUSES = ["scheduled", "in-progress", "completed", "cancelled"] as const;
type VisitStatus = typeof VISIT_STATUSES[number];
const STATUS_CONFIG: Record<VisitStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "in-progress": { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const visitId = parseInt(id ?? "0");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: visit, isLoading } = trpc.visits.getById.useQuery({ id: visitId }, { enabled: visitId > 0 });
  const updateMutation = trpc.visits.update.useMutation({
    onSuccess: () => { toast.success("Visit updated"); utils.visits.getById.invalidate({ id: visitId }); setShowEdit(false); },
    onError: (e) => toast.error(e.message),
  });
  const openEdit = () => {
    if (!visit) return;
    setForm({
      visitDate: visit.visitDate ? format(new Date(visit.visitDate), "yyyy-MM-dd'T'HH:mm") : "",
      chiefComplaint: visit.chiefComplaint ?? "", symptoms: visit.symptoms ?? "",
      diagnosisText: visit.diagnosisText ?? "", doctorNotes: visit.doctorNotes ?? "",
      followUpDate: visit.followUpDate ? format(new Date(visit.followUpDate), "yyyy-MM-dd") : "",
      followUpNotes: visit.followUpNotes ?? "", status: visit.status ?? "completed",
      bloodPressureSystolic: visit.bloodPressureSystolic?.toString() ?? "",
      bloodPressureDiastolic: visit.bloodPressureDiastolic?.toString() ?? "",
      heartRate: visit.heartRate?.toString() ?? "", temperature: visit.temperature ?? "",
      weight: visit.weight ?? "", height: visit.height ?? "",
      oxygenSaturation: visit.oxygenSaturation?.toString() ?? "",
      respiratoryRate: visit.respiratoryRate?.toString() ?? "",
    });
    setShowEdit(true);
  };
  const handleUpdate = () => {
    updateMutation.mutate({
      id: visitId, visitDate: form.visitDate,
      chiefComplaint: form.chiefComplaint || undefined, symptoms: form.symptoms || undefined,
      diagnosisText: form.diagnosisText || undefined, doctorNotes: form.doctorNotes || undefined,
      followUpDate: form.followUpDate || undefined, followUpNotes: form.followUpNotes || undefined,
      status: form.status,
      bloodPressureSystolic: form.bloodPressureSystolic ? parseInt(form.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: form.bloodPressureDiastolic ? parseInt(form.bloodPressureDiastolic) : undefined,
      heartRate: form.heartRate ? parseInt(form.heartRate) : undefined,
      temperature: form.temperature || undefined, weight: form.weight || undefined,
      height: form.height || undefined,
      oxygenSaturation: form.oxygenSaturation ? parseInt(form.oxygenSaturation) : undefined,
      respiratoryRate: form.respiratoryRate ? parseInt(form.respiratoryRate) : undefined,
    });
  };
  const canManage = user?.role === "admin" || user?.role === "doctor";
  if (isLoading) return <div className="p-6 space-y-4 max-w-4xl mx-auto"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  if (!visit) return (
    <div className="p-6 text-center">
      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
      <p className="text-muted-foreground">Visit not found.</p>
      <Link href="/visits"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
    </div>
  );
  const sc = STATUS_CONFIG[visit.status as VisitStatus] ?? STATUS_CONFIG.completed;
  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto print:p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/visits"><Button variant="ghost" size="sm" className="gap-1.5 h-8 text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Visits</Button></Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Visit #{visit.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</Button>
          {canManage && <Button size="sm" className="gap-2 h-8" onClick={openEdit}><Edit className="w-4 h-4" /> Edit</Button>}
        </div>
      </div>
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Visit Record #{visit.id}</h1>
        <p className="text-sm text-gray-600">{visit.visitDate ? format(new Date(visit.visitDate), "MMMM d, yyyy") : ""}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visit Summary</p>
                <Badge className={`text-xs border ${sc.className}`}>{sc.label}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /><span>{visit.visitDate ? format(new Date(visit.visitDate), "EEEE, MMMM d, yyyy") : "—"}</span></div>
                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-3.5 h-3.5 flex-shrink-0" /><span>{visit.visitDate ? format(new Date(visit.visitDate), "h:mm a") : "—"}</span></div>
                <div className="flex items-center gap-2 text-muted-foreground"><User className="w-3.5 h-3.5 flex-shrink-0" /><Link href={`/patients/${visit.patientId}`}><span className="text-primary hover:underline">Patient #{visit.patientId}</span></Link></div>
              </div>
              {visit.followUpDate && (<><Separator /><div className="text-sm"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Follow-up</p><p className="text-amber-600 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{format(new Date(visit.followUpDate), "MMMM d, yyyy")}</p>{visit.followUpNotes && <p className="text-xs text-muted-foreground mt-1">{visit.followUpNotes}</p>}</div></>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Vital Signs</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {[
                { icon: <Heart className="w-3.5 h-3.5 text-red-500" />, label: "Blood Pressure", value: visit.bloodPressureSystolic ? `${visit.bloodPressureSystolic}/${visit.bloodPressureDiastolic} mmHg` : null },
                { icon: <Activity className="w-3.5 h-3.5 text-blue-500" />, label: "Heart Rate", value: visit.heartRate ? `${visit.heartRate} bpm` : null },
                { icon: <Thermometer className="w-3.5 h-3.5 text-orange-500" />, label: "Temperature", value: visit.temperature ? `${visit.temperature}°C` : null },
                { icon: <Droplets className="w-3.5 h-3.5 text-cyan-500" />, label: "O₂ Saturation", value: visit.oxygenSaturation ? `${visit.oxygenSaturation}%` : null },
                { icon: <Wind className="w-3.5 h-3.5 text-teal-500" />, label: "Respiratory Rate", value: visit.respiratoryRate ? `${visit.respiratoryRate}/min` : null },
                { icon: <FileText className="w-3.5 h-3.5 text-purple-500" />, label: "Weight", value: visit.weight ? `${visit.weight} kg` : null },
                { icon: <FileText className="w-3.5 h-3.5 text-green-500" />, label: "Height", value: visit.height ? `${visit.height} cm` : null },
              ].filter(v => v.value !== null).map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">{item.icon}{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
              {!visit.bloodPressureSystolic && !visit.heartRate && !visit.temperature && <p className="text-xs text-muted-foreground text-center py-2">No vital signs recorded</p>}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {visit.chiefComplaint && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Chief Complaint</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm">{visit.chiefComplaint}</p></CardContent></Card>}
          {visit.symptoms && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Symptoms</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm leading-relaxed">{visit.symptoms}</p></CardContent></Card>}
          {visit.diagnosisText && <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Diagnosis</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm font-medium">{visit.diagnosisText}</p></CardContent></Card>}
          {visit.doctorNotes && <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Doctor Notes</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm leading-relaxed whitespace-pre-wrap">{visit.doctorNotes}</p></CardContent></Card>}
          <div className="grid grid-cols-2 gap-3 print:hidden">
            <Link href={`/prescriptions?patientId=${visit.patientId}&visitId=${visit.id}`}><Button variant="outline" className="w-full gap-2 h-10"><Pill className="w-4 h-4 text-primary" /> Add Prescription</Button></Link>
            <Link href={`/files?patientId=${visit.patientId}&visitId=${visit.id}`}><Button variant="outline" className="w-full gap-2 h-10"><FileText className="w-4 h-4 text-primary" /> Upload Files</Button></Link>
          </div>
        </div>
      </div>
      <Dialog open={showEdit} onOpenChange={(v) => setShowEdit(v)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Visit #{visit.id}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>Visit Date *</Label><Input type="datetime-local" value={form.visitDate ?? ""} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={form.status ?? "completed"} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VISIT_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Chief Complaint</Label><Input value={form.chiefComplaint ?? ""} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Symptoms</Label><Textarea value={form.symptoms ?? ""} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} rows={2} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Diagnosis</Label><Input value={form.diagnosisText ?? ""} onChange={(e) => setForm({ ...form, diagnosisText: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>BP Systolic</Label><Input type="number" value={form.bloodPressureSystolic ?? ""} onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })} placeholder="120" /></div>
            <div className="space-y-1.5"><Label>BP Diastolic</Label><Input type="number" value={form.bloodPressureDiastolic ?? ""} onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })} placeholder="80" /></div>
            <div className="space-y-1.5"><Label>Heart Rate (bpm)</Label><Input type="number" value={form.heartRate ?? ""} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Temperature (°C)</Label><Input value={form.temperature ?? ""} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Weight (kg)</Label><Input value={form.weight ?? ""} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Height (cm)</Label><Input value={form.height ?? ""} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>O₂ Saturation (%)</Label><Input type="number" value={form.oxygenSaturation ?? ""} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Respiratory Rate</Label><Input type="number" value={form.respiratoryRate ?? ""} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Follow-up Date</Label><Input type="date" value={form.followUpDate ?? ""} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Follow-up Notes</Label><Input value={form.followUpNotes ?? ""} onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Doctor Notes</Label><Textarea value={form.doctorNotes ?? ""} onChange={(e) => setForm({ ...form, doctorNotes: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
