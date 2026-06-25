import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, MapPin, Droplets, AlertTriangle, Heart, Stethoscope, Pill, FileText, Calendar, ChevronRight, Activity } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { STATUS_CLASSES, STATUS_LABELS, FILE_CATEGORY_LABELS } from "@/lib/types";

export default function PatientProfile() {
  const params = useParams<{ id: string }>();
  const patientId = parseInt(params.id ?? "0");
  const { data: patient, isLoading } = trpc.patients.getById.useQuery({ id: patientId });
  const { data: visits } = trpc.visits.byPatient.useQuery({ patientId });
  const { data: prescriptions } = trpc.prescriptions.byPatient.useQuery({ patientId });
  const { data: files } = trpc.files.byPatient.useQuery({ patientId });
  const { data: appointmentsData } = trpc.appointments.list.useQuery({ patientId, limit: 50 });

  if (isLoading) return <div className="p-6 space-y-4 max-w-5xl mx-auto"><Skeleton className="h-8 w-48" /><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;
  if (!patient) return <div className="p-6 text-center"><p className="text-muted-foreground">Patient not found.</p><Link href="/patients"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link></div>;

  const age = patient.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : null;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/patients"><Button variant="ghost" size="sm" className="gap-2 h-8 text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Patients</Button></Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{patient.fullName}</span>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-primary">{patient.fullName.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{patient.fullName}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{patient.patientId}</span>
                    {age !== null && <span className="text-sm text-muted-foreground">{age} yrs · <span className="capitalize">{patient.gender}</span></span>}
                    {patient.occupation && <span className="text-sm text-muted-foreground">· {patient.occupation}</span>}
                  </div>
                </div>
                <Badge className={`text-xs border ml-auto ${STATUS_CLASSES[patient.status as keyof typeof STATUS_CLASSES] ?? ""}`}>{STATUS_LABELS[patient.status as keyof typeof STATUS_LABELS] ?? patient.status}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {patient.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-sm">{patient.phone}</span></div>}
                {patient.bloodType && patient.bloodType !== "unknown" && <div className="flex items-center gap-2"><Droplets className="w-3.5 h-3.5 text-red-500" /><span className="text-sm font-semibold text-red-600">{patient.bloodType}</span></div>}
                {patient.address && <div className="flex items-center gap-2 col-span-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-sm text-muted-foreground truncate">{patient.address}</span></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.allergies && <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-medium"><AlertTriangle className="w-3 h-3" />Allergies: {patient.allergies}</div>}
                {patient.chronicDiseases && <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-medium"><Heart className="w-3 h-3" />{patient.chronicDiseases}</div>}
              </div>
            </div>
          </div>
          {patient.emergencyContactName && <><Separator className="my-4" /><div className="flex items-center gap-3 text-sm"><span className="text-muted-foreground font-medium">Emergency:</span><span className="font-medium">{patient.emergencyContactName}</span>{patient.emergencyContactRelation && <span className="text-muted-foreground">({patient.emergencyContactRelation})</span>}{patient.emergencyContactPhone && <span className="text-muted-foreground">{patient.emergencyContactPhone}</span>}</div></>}
          {patient.medicalNotes && <><Separator className="my-4" /><p className="text-sm text-muted-foreground">{patient.medicalNotes}</p></>}
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="visits">Visits ({visits?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="prescriptions">Rx ({prescriptions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="files">Files ({files?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="appointments">Appts ({appointmentsData?.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Medical Timeline</CardTitle></CardHeader>
          <CardContent>
            {visits?.length === 0 ? <div className="text-center py-10 text-muted-foreground"><Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No visits recorded yet</p></div>
            : <div className="relative"><div className="absolute left-4 top-0 bottom-0 w-px bg-border" /><div className="space-y-4 pl-10">
              {visits?.map((v) => (
                <div key={v.id} className="relative">
                  <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />
                  <Card className="border border-border shadow-none"><CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{v.diagnosisText || "Visit"}</span>
                          <Badge className={`text-xs ${v.status === "completed" ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{v.status}</Badge>
                        </div>
                        {v.symptoms && <p className="text-xs text-muted-foreground mt-1">{v.symptoms}</p>}
                        {v.doctorNotes && <p className="text-sm mt-2 line-clamp-2">{v.doctorNotes}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {v.bloodPressureSystolic && <span>BP: {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</span>}
                          {v.heartRate && <span>HR: {v.heartRate} bpm</span>}
                          {v.temperature && <span>Temp: {v.temperature}°C</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium">{format(new Date(v.visitDate), "MMM d, yyyy")}</p>
                        {v.followUpDate && <p className="text-xs text-amber-600 mt-1">Follow-up: {format(new Date(v.followUpDate), "MMM d")}</p>}
                      </div>
                    </div>
                  </CardContent></Card>
                </div>
              ))}
            </div></div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <div className="flex justify-end mb-3"><Link href={`/visits?patientId=${patientId}`}><Button size="sm" className="gap-2 h-8"><Stethoscope className="w-4 h-4" /> Add Visit</Button></Link></div>
          <div className="space-y-3">
            {visits?.map((v) => (<Card key={v.id} className="card-hover"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><p className="font-semibold">{v.diagnosisText || "Visit"}</p>{v.chiefComplaint && <p className="text-sm text-muted-foreground mt-0.5">{v.chiefComplaint}</p>}{v.doctorNotes && <p className="text-sm mt-2 line-clamp-2">{v.doctorNotes}</p>}</div><div className="text-right flex-shrink-0"><p className="text-sm font-medium">{format(new Date(v.visitDate), "MMM d, yyyy")}</p><Badge className={`text-xs mt-1 ${v.status === "completed" ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{v.status}</Badge></div></div></CardContent></Card>))}
            {visits?.length === 0 && <div className="text-center py-10 text-muted-foreground"><Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No visits recorded</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <div className="flex justify-end mb-3"><Link href={`/prescriptions?patientId=${patientId}`}><Button size="sm" className="gap-2 h-8"><Pill className="w-4 h-4" /> New Rx</Button></Link></div>
          <div className="space-y-3">
            {prescriptions?.map((rx) => (<Card key={rx.id} className="card-hover"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1">{Array.isArray(rx.medications) && rx.medications.slice(0, 3).map((med: any, i: number) => (<div key={i} className="flex items-center gap-2 text-sm"><Pill className="w-3 h-3 text-primary" /><span className="font-medium">{med.medicine}</span><span className="text-muted-foreground">{med.dose} · {med.frequency}</span></div>))}</div><p className="text-sm text-muted-foreground flex-shrink-0">{format(new Date(rx.createdAt), "MMM d, yyyy")}</p></div></CardContent></Card>))}
            {prescriptions?.length === 0 && <div className="text-center py-10 text-muted-foreground"><Pill className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No prescriptions yet</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="flex justify-end mb-3"><Link href={`/files?patientId=${patientId}`}><Button size="sm" className="gap-2 h-8"><FileText className="w-4 h-4" /> Upload File</Button></Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files?.map((f) => (<Card key={f.id} className="card-hover cursor-pointer"><CardContent className="p-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{f.originalName}</p><p className="text-xs text-muted-foreground">{FILE_CATEGORY_LABELS[f.category as keyof typeof FILE_CATEGORY_LABELS] ?? f.category}</p><p className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "MMM d, yyyy")}</p></div></div></CardContent></Card>))}
            {files?.length === 0 && <div className="col-span-3 text-center py-10 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No files uploaded</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <div className="space-y-3">
            {appointmentsData?.data?.map((a) => (<Card key={a.id} className="card-hover"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1"><p className="font-medium">{a.reason || "Appointment"}</p><p className="text-sm text-muted-foreground mt-0.5">{format(new Date(a.appointmentDate), "EEEE, MMMM d, yyyy")} at {format(new Date(a.appointmentDate), "h:mm a")}</p>{a.notes && <p className="text-sm text-muted-foreground mt-1">{a.notes}</p>}</div><Badge className={`text-xs border ${a.status === "completed" ? "appt-completed" : a.status === "cancelled" ? "appt-cancelled" : "appt-pending"}`}>{a.status}</Badge></div></CardContent></Card>))}
            {!appointmentsData?.data?.length && <div className="text-center py-10 text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No appointments</p></div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
