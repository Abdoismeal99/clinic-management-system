import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Phone, MapPin, Heart, AlertTriangle, Calendar, Stethoscope,
  Pill, FileText, Edit, ArrowLeft, Clock, Activity, Printer,
  ChevronRight, Plus, Trash2, Eye, Download, PenLine, CheckCircle2,
  XCircle, RefreshCw, Droplets
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { STATUS_CLASSES, STATUS_LABELS, FILE_CATEGORY_LABELS, BLOOD_TYPES, canManageVisits, canDelete } from "@/lib/types";
import type { PatientStatus } from "@/lib/types";
import ImageAnnotator from "@/components/ImageAnnotator";
import PatientPdfExport from "@/components/PatientPdfExport";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id ?? "0");
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [annotateUrl, setAnnotateUrl] = useState<string | null>(null);
  const [annotateName, setAnnotateName] = useState("");
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);
  const [deletePrescId, setDeletePrescId] = useState<number | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<number | null>(null);

  const { data: patient, isLoading } = trpc.patients.getById.useQuery({ id: patientId }, { enabled: patientId > 0 });
  const { data: visits, isLoading: loadingVisits } = trpc.visits.byPatient.useQuery({ patientId }, { enabled: patientId > 0 });
  const { data: prescriptions } = trpc.prescriptions.byPatient.useQuery({ patientId }, { enabled: patientId > 0 });
  const { data: files } = trpc.files.byPatient.useQuery({ patientId }, { enabled: patientId > 0 });
  const { data: appointmentsData } = trpc.appointments.list.useQuery({ patientId, limit: 50 }, { enabled: patientId > 0 });

  const updateMutation = trpc.patients.update.useMutation({
    onSuccess: () => { toast.success("Patient updated"); utils.patients.getById.invalidate({ id: patientId }); setShowEdit(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteVisitMutation = trpc.visits.delete.useMutation({
    onSuccess: () => { toast.success("Visit removed"); utils.visits.byPatient.invalidate({ patientId }); setDeleteVisitId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deletePrescMutation = trpc.prescriptions.delete.useMutation({
    onSuccess: () => { toast.success("Prescription removed"); utils.prescriptions.byPatient.invalidate({ patientId }); setDeletePrescId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFileMutation = trpc.files.delete.useMutation({
    onSuccess: () => { toast.success("File removed"); utils.files.byPatient.invalidate({ patientId }); setDeleteFileId(null); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = () => {
    if (!patient) return;
    setEditForm({
      fullName: patient.fullName ?? "",
      gender: patient.gender ?? "male",
      dateOfBirth: patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "yyyy-MM-dd") : "",
      phone: patient.phone ?? "",
      address: patient.address ?? "",
      occupation: patient.occupation ?? "",
      bloodType: patient.bloodType ?? "unknown",
      allergies: patient.allergies ?? "",
      chronicDiseases: patient.chronicDiseases ?? "",
      emergencyContactName: patient.emergencyContactName ?? "",
      emergencyContactPhone: patient.emergencyContactPhone ?? "",
      emergencyContactRelation: patient.emergencyContactRelation ?? "",
      medicalNotes: patient.medicalNotes ?? "",
      status: patient.status ?? "new",
    });
    setShowEdit(true);
  };

  const handlePreview = async (fileId: number, name: string) => {
    try {
      const result = await utils.files.getPresignedUrl.fetch({ id: fileId });
      setPreviewUrl(result.url);
      setPreviewName(name);
    } catch { toast.error("Could not load file preview"); }
  };

  const handleAnnotate = async (fileId: number, name: string) => {
    try {
      const result = await utils.files.getPresignedUrl.fetch({ id: fileId });
      setAnnotateUrl(result.url);
      setAnnotateName(name);
    } catch { toast.error("Could not load file for annotation"); }
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);

  const handlePrint = () => window.print();

  const canEdit = user?.role === "admin" || user?.role === "doctor" || user?.role === "assistant";
  const canDel = user?.role ? canDelete(user.role as any) : false;
  const canManageRx = user?.role ? canManageVisits(user.role as any) : false;

  const age = patient?.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-48" /></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Patient not found.</p>
        <Link href="/patients"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> Back to Patients</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto print:p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/patients"><Button variant="ghost" size="sm" className="gap-1.5 h-8 text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Patients</Button></Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-xs">{patient.fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={handlePrint}><Printer className="w-4 h-4" /> Print</Button>
          <PatientPdfExport patientId={patientId} patientName={patient.fullName} />
          {canEdit && <Button size="sm" className="gap-2 h-8" onClick={openEdit}><Edit className="w-4 h-4" /> Edit</Button>}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">{patient.fullName}</h1>
        <p className="text-sm text-gray-600">Patient ID: {patient.patientId} · Printed: {format(new Date(), "MMMM d, yyyy")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Patient Info */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  {patient.fullName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground leading-tight">{patient.fullName}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{patient.patientId}</p>
                  <Badge className={`text-xs mt-1 ${STATUS_CLASSES[patient.status as PatientStatus] ?? ""}`}>
                    {STATUS_LABELS[patient.status as PatientStatus] ?? patient.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {age !== null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{age} years · <span className="capitalize">{patient.gender}</span></span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{patient.address}</span>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{format(new Date(patient.dateOfBirth), "MMM d, yyyy")}</span>
                  </div>
                )}
                {patient.occupation && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{patient.occupation}</span>
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Droplets className="w-3 h-3" /> Blood Type</span>
                  <span className="font-semibold text-red-600">{patient.bloodType !== "unknown" ? patient.bloodType : "—"}</span>
                </div>
                {patient.allergies && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div><p className="text-xs font-semibold text-red-700">الحساسيات</p><p className="text-xs text-red-600">{patient.allergies}</p></div>
                  </div>
                )}
                {patient.chronicDiseases && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    <Heart className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div><p className="text-xs font-semibold text-amber-700">Chronic Conditions</p><p className="text-xs text-amber-600">{patient.chronicDiseases}</p></div>
                  </div>
                )}
              </div>

              {(patient.emergencyContactName || patient.emergencyContactPhone) && (
                <>
                  <Separator className="my-3" />
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">جهة الاتصال الطارئة</p>
                    {patient.emergencyContactName && <p className="font-medium">{patient.emergencyContactName}</p>}
                    {patient.emergencyContactRelation && <p className="text-muted-foreground text-xs">{patient.emergencyContactRelation}</p>}
                    {patient.emergencyContactPhone && (
                      <p className="text-muted-foreground flex items-center gap-1 mt-1 text-xs">
                        <Phone className="w-3 h-3" />{patient.emergencyContactPhone}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Visits", value: visits?.length ?? 0 },
              { label: "Prescriptions", value: prescriptions?.length ?? 0 },
              { label: "Files", value: files?.length ?? 0 },
              { label: "Appointments", value: appointmentsData?.data?.length ?? 0 },
            ].map((s) => (
              <Card key={s.label}><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent></Card>
            ))}
          </div>

          {patient.medicalNotes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Doctor Notes</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed">{patient.medicalNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline">
            <TabsList className="grid grid-cols-5 w-full h-9 print:hidden">
              <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
              <TabsTrigger value="visits" className="text-xs">Visits</TabsTrigger>
              <TabsTrigger value="prescriptions" className="text-xs">Rx</TabsTrigger>
              <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs">Appts</TabsTrigger>
            </TabsList>

            {/* Timeline */}
            <TabsContent value="timeline" className="mt-4">
              {loadingVisits ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : (visits?.length ?? 0) === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No medical history yet</p>
                  {canManageRx && (
                    <Link href={`/visits?patientId=${patientId}`}>
                      <Button size="sm" className="mt-3 gap-2 h-8"><Plus className="w-3 h-3" /> Add First Visit</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="relative pl-7">
                  <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-border" />
                  {visits?.map((v) => (
                    <div key={v.id} className="relative mb-4 last:mb-0">
                      <div className="absolute -left-5 top-4 w-3 h-3 rounded-full border-2 border-primary bg-background" />
                      <Card className="card-hover">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {v.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> :
                                 v.status === "cancelled" ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" /> :
                                 v.status === "in-progress" ? <RefreshCw className="w-4 h-4 text-blue-500 flex-shrink-0" /> :
                                 <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                                <p className="font-semibold text-sm">{v.diagnosisText || v.chiefComplaint || "Visit"}</p>
                                <Badge className="text-xs bg-muted text-muted-foreground border-0">{v.status}</Badge>
                              </div>
                              {v.chiefComplaint && v.diagnosisText && <p className="text-xs text-muted-foreground mt-1">{v.chiefComplaint}</p>}
                              {v.symptoms && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Symptoms: {v.symptoms}</p>}
                              {v.doctorNotes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{v.doctorNotes}"</p>}
                              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                                {v.bloodPressureSystolic && <span>BP: {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</span>}
                                {v.heartRate && <span>HR: {v.heartRate} bpm</span>}
                                {v.temperature && <span>Temp: {v.temperature}°C</span>}
                                {v.weight && <span>Wt: {v.weight} kg</span>}
                              </div>
                              {v.followUpDate && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Follow-up: {format(new Date(v.followUpDate), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-medium text-muted-foreground">{format(new Date(v.visitDate), "MMM d, yyyy")}</p>
                              <Link href={`/visits/${v.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs mt-1 gap-1">View <ChevronRight className="w-3 h-3" /></Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
              {canManageRx && (
                <div className="mt-4 print:hidden">
                  <Link href={`/visits?patientId=${patientId}`}>
                    <Button size="sm" className="gap-2 h-8 w-full" variant="outline"><Plus className="w-3 h-3" /> Add New Visit</Button>
                  </Link>
                </div>
              )}
            </TabsContent>

            {/* Visits */}
            <TabsContent value="visits" className="mt-4">
              <div className="flex justify-between items-center mb-3 print:hidden">
                <p className="text-sm text-muted-foreground">{visits?.length ?? 0} visits recorded</p>
                {canManageRx && (
                  <Link href={`/visits?patientId=${patientId}`}>
                    <Button size="sm" className="gap-2 h-8"><Plus className="w-3 h-3" /> Add Visit</Button>
                  </Link>
                )}
              </div>
              <div className="space-y-3">
                {loadingVisits ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />) :
                  visits?.map((v) => (
                    <Card key={v.id} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{v.diagnosisText || "Visit"}</p>
                              <Badge className={`text-xs border ${v.status === "completed" ? "bg-green-50 text-green-700 border-green-200" : v.status === "cancelled" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{v.status}</Badge>
                            </div>
                            {v.chiefComplaint && <p className="text-xs text-muted-foreground mt-1">{v.chiefComplaint}</p>}
                            {v.symptoms && <p className="text-xs text-muted-foreground mt-1">Symptoms: {v.symptoms}</p>}
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                              {v.bloodPressureSystolic && <span>BP: {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</span>}
                              {v.heartRate && <span>HR: {v.heartRate} bpm</span>}
                              {v.temperature && <span>Temp: {v.temperature}°C</span>}
                              {v.weight && <span>Wt: {v.weight} kg</span>}
                            </div>
                            {v.doctorNotes && <p className="text-xs mt-2 italic text-muted-foreground line-clamp-2">"{v.doctorNotes}"</p>}
                            {v.followUpDate && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Follow-up: {format(new Date(v.followUpDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 space-y-1">
                            <p className="text-xs font-medium">{format(new Date(v.visitDate), "MMM d, yyyy")}</p>
                            <div className="flex gap-1 justify-end">
                              <Link href={`/visits/${v.id}`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Eye className="w-3 h-3" /> View</Button>
                              </Link>
                              {canDel && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteVisitId(v.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {!loadingVisits && visits?.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No visits recorded</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Prescriptions */}
            <TabsContent value="prescriptions" className="mt-4">
              <div className="flex justify-between items-center mb-3 print:hidden">
                <p className="text-sm text-muted-foreground">{prescriptions?.length ?? 0} prescriptions</p>
                {canManageRx && (
                  <Link href={`/prescriptions?patientId=${patientId}`}>
                    <Button size="sm" className="gap-2 h-8"><Plus className="w-3 h-3" /> New Rx</Button>
                  </Link>
                )}
              </div>
              <div className="space-y-3">
                {prescriptions?.map((rx) => (
                  <Card key={rx.id} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-2 font-medium">{format(new Date(rx.createdAt), "MMMM d, yyyy")}</p>
                          {Array.isArray(rx.medications) && rx.medications.map((med: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
                              <Pill className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{med.medicine}</span>
                                <span className="text-muted-foreground"> — {med.dose} · {med.frequency} · {med.duration}</span>
                                {med.instructions && <p className="text-xs text-muted-foreground">{med.instructions}</p>}
                              </div>
                            </div>
                          ))}
                          {rx.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {rx.notes}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Link href={`/prescriptions?patientId=${patientId}&rxId=${rx.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Printer className="w-3 h-3" /> Print</Button>
                          </Link>
                          {canDel && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletePrescId(rx.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {prescriptions?.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Pill className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>لا توجد وصفات بعد</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Files */}
            <TabsContent value="files" className="mt-4">
              <div className="flex justify-between items-center mb-3 print:hidden">
                <p className="text-sm text-muted-foreground">{files?.length ?? 0} files</p>
                <Link href={`/files?patientId=${patientId}`}>
                  <Button size="sm" className="gap-2 h-8"><Plus className="w-3 h-3" /> Upload File</Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {files?.map((f) => (
                  <Card key={f.id} className="card-hover">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.originalName}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className="text-xs bg-muted text-muted-foreground border-0">
                              {FILE_CATEGORY_LABELS[f.category as keyof typeof FILE_CATEGORY_LABELS] ?? f.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "MMM d, yyyy")}</span>
                          </div>
                          {f.description && <p className="text-xs text-muted-foreground mt-1 truncate">{f.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 print:hidden">
                        {(f as any).presignedUrl && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handlePreview(f.id, f.originalName)}>
                            <Eye className="w-3 h-3" /> Preview
                          </Button>
                        )}
                        {(f as any).presignedUrl && isImageFile(f.originalName) && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" title="Annotate" onClick={() => handleAnnotate(f.id, f.originalName)}>
                            <PenLine className="w-3 h-3" />
                          </Button>
                        )}
                        {(f as any).presignedUrl && (
                          <a href={(f as any).presignedUrl} download={f.originalName} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="w-3 h-3" /></Button>
                          </a>
                        )}
                        {canDel && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteFileId(f.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {files?.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No files uploaded</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Appointments */}
            <TabsContent value="appointments" className="mt-4">
              <div className="flex justify-between items-center mb-3 print:hidden">
                <p className="text-sm text-muted-foreground">{appointmentsData?.data?.length ?? 0} appointments</p>
                <Link href={`/appointments?patientId=${patientId}`}>
                  <Button size="sm" className="gap-2 h-8"><Plus className="w-3 h-3" /> Schedule</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {appointmentsData?.data?.map((a) => (
                  <Card key={a.id} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{a.reason || "Appointment"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(a.appointmentDate), "EEEE, MMMM d, yyyy")} at {format(new Date(a.appointmentDate), "h:mm a")}
                          </p>
                          {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                        </div>
                        <Badge className={`text-xs border flex-shrink-0 ${
                          a.status === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                          a.status === "cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>{a.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!appointmentsData?.data?.length && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No appointments</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Patient Dialog */}
      <Dialog open={showEdit} onOpenChange={(v) => setShowEdit(v)}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Patient — {patient.fullName}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5"><Label>Full Name *</Label><Input value={editForm.fullName ?? ""} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Gender *</Label>
              <Select value={editForm.gender ?? "male"} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>تاريخ الميلاد</Label><Input type="date" value={editForm.dateOfBirth ?? ""} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الهاتف</Label><Input value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Occupation</Label><Input value={editForm.occupation ?? ""} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>فصيلة الدم</Label>
              <Select value={editForm.bloodType ?? "unknown"} onValueChange={(v) => setEditForm({ ...editForm, bloodType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_TYPES.map((bt) => <SelectItem key={bt} value={bt}>{bt === "unknown" ? "Unknown" : bt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={editForm.status ?? "new"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="new">جديد</SelectItem><SelectItem value="follow-up">المتابعة</SelectItem><SelectItem value="stable">مستقر</SelectItem><SelectItem value="critical">حرج</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5"><Label>العنوان</Label><Input value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>الحساسيات</Label><Input value={editForm.allergies ?? ""} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} placeholder="e.g. Penicillin, Aspirin" /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>الأمراض المزمنة</Label><Input value={editForm.chronicDiseases ?? ""} onChange={(e) => setEditForm({ ...editForm, chronicDiseases: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Emergency Contact Name</Label><Input value={editForm.emergencyContactName ?? ""} onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Emergency Phone</Label><Input value={editForm.emergencyContactPhone ?? ""} onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Relation</Label><Input value={editForm.emergencyContactRelation ?? ""} onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Medical Notes</Label><Textarea value={editForm.medicalNotes ?? ""} onChange={(e) => setEditForm({ ...editForm, medicalNotes: e.target.value })} rows={3} placeholder="General notes, observations..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>إلغاء</Button>
            <Button onClick={() => updateMutation.mutate({ id: patientId, ...editForm, dateOfBirth: editForm.dateOfBirth || undefined })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Visit Confirm */}
      <Dialog open={!!deleteVisitId} onOpenChange={(v) => !v && setDeleteVisitId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Visit?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This visit will be permanently removed from the patient's record.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVisitId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteVisitId && deleteVisitMutation.mutate({ id: deleteVisitId })} disabled={deleteVisitMutation.isPending}>
              {deleteVisitMutation.isPending ? "Deleting..." : "Delete Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Prescription Confirm */}
      <Dialog open={!!deletePrescId} onOpenChange={(v) => !v && setDeletePrescId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Prescription?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This prescription will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePrescId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deletePrescId && deletePrescMutation.mutate({ id: deletePrescId })} disabled={deletePrescMutation.isPending}>
              {deletePrescMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirm */}
      <Dialog open={!!deleteFileId} onOpenChange={(v) => !v && setDeleteFileId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle>Delete File?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This file will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFileId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteFileId && deleteFileMutation.mutate({ id: deleteFileId })} disabled={deleteFileMutation.isPending}>
              {deleteFileMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview */}
      <Dialog open={!!previewUrl} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="truncate">{previewName}</DialogTitle></DialogHeader>
          <div className="overflow-auto">
            {previewUrl && isImageFile(previewName) ? (
              <img src={previewUrl} alt={previewName} className="max-w-full rounded-lg mx-auto" />
            ) : previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border" title={previewName} />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewUrl(null)}>Close</Button>
            {previewUrl && <a href={previewUrl} download={previewName} target="_blank" rel="noreferrer"><Button className="gap-2"><Download className="w-4 h-4" /> Download</Button></a>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Annotator */}
      {annotateUrl && (
        <ImageAnnotator
          imageUrl={annotateUrl}
          fileName={annotateName}
          open={!!annotateUrl}
          onClose={() => { setAnnotateUrl(null); setAnnotateName(""); }}
        />
      )}
    </div>
  );
}
