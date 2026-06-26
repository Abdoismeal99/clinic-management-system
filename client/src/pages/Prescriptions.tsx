import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef } from "react";
import { useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pill, Plus, Trash2, Printer, Star, StarOff, BookTemplate, X, AlertCircle, ChevronRight, User, Calendar } from "lucide-react";
import { format } from "date-fns";

const EMPTY_MED = { medicine: "", dose: "", frequency: "", duration: "", instructions: "" };

export default function Prescriptions() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const prePatientId = params.get("patientId") ? parseInt(params.get("patientId")!) : 0;
  const preRxId = params.get("rxId") ? parseInt(params.get("rxId")!) : null;

  const { user } = useAuth();
  const utils = trpc.useUtils();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedPatientId, setSelectedPatientId] = useState(prePatientId);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [printRxId, setPrintRxId] = useState<number | null>(preRxId);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  // Form state
  const [medications, setMedications] = useState([{ ...EMPTY_MED }]);
  const [notes, setNotes] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateMeds, setTemplateMeds] = useState([{ ...EMPTY_MED }]);
  const [templateFavorite, setTemplateFavorite] = useState(false);

  const { data: patientsData } = trpc.patients.list.useQuery({ search: patientSearch, limit: 20 });
  const { data: prescriptions, isLoading } = trpc.prescriptions.byPatient.useQuery(
    { patientId: selectedPatientId },
    { enabled: selectedPatientId > 0 }
  );
  const { data: printRx } = trpc.prescriptions.getById.useQuery(
    { id: printRxId! },
    { enabled: !!printRxId }
  );
  const { data: templates, isLoading: loadingTemplates } = trpc.prescriptions.templates.useQuery();

  const createMutation = trpc.prescriptions.create.useMutation({
    onSuccess: () => {
      toast.success("Prescription created");
      utils.prescriptions.byPatient.invalidate({ patientId: selectedPatientId });
      setShowCreate(false);
      setMedications([{ ...EMPTY_MED }]);
      setNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.prescriptions.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.prescriptions.byPatient.invalidate({ patientId: selectedPatientId }); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const createTemplateMutation = trpc.prescriptions.createTemplate.useMutation({
    onSuccess: () => { toast.success("Template saved"); utils.prescriptions.templates.invalidate(); setShowTemplate(false); setTemplateName(""); setTemplateMeds([{ ...EMPTY_MED }]); },
    onError: (e) => toast.error(e.message),
  });

  const toggleFavMutation = trpc.prescriptions.updateTemplate.useMutation({
    onSuccess: () => utils.prescriptions.templates.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplateMutation = trpc.prescriptions.deleteTemplate.useMutation({
    onSuccess: () => { toast.success("Template deleted"); utils.prescriptions.templates.invalidate(); setDeleteTemplateId(null); },
    onError: (e) => toast.error(e.message),
  });

  const addMed = () => setMedications([...medications, { ...EMPTY_MED }]);
  const removeMed = (i: number) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: string, value: string) => {
    setMedications(medications.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const addTemplateMed = () => setTemplateMeds([...templateMeds, { ...EMPTY_MED }]);
  const removeTemplateMed = (i: number) => setTemplateMeds(templateMeds.filter((_, idx) => idx !== i));
  const updateTemplateMed = (i: number, field: string, value: string) => {
    setTemplateMeds(templateMeds.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const loadTemplate = (t: any) => {
    setMedications(Array.isArray(t.medications) ? t.medications.map((m: any) => ({ ...EMPTY_MED, ...m })) : [{ ...EMPTY_MED }]);
    setShowCreate(true);
  };

  const handleCreate = () => {
    if (!selectedPatientId) { toast.error("Select a patient first"); return; }
    const valid = medications.every(m => m.medicine && m.dose && m.frequency && m.duration);
    if (!valid) { toast.error("Fill in all medication fields"); return; }
    createMutation.mutate({ patientId: selectedPatientId, medications, notes: notes || undefined });
  };

  const handlePrint = () => window.print();

  const canManage = user?.role === "admin" || user?.role === "doctor" || (user as any)?.tenantRole === "clinic_admin";

  // Find selected patient info
  const selectedPatient = patientsData?.data?.find(p => p.id === selectedPatientId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage prescriptions and templates</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setShowTemplate(true)}>
              <BookTemplate className="w-4 h-4" /> New Template
            </Button>
            <Button size="sm" className="gap-2 h-9" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New Prescription
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="prescriptions">
        <TabsList className="h-9">
          <TabsTrigger value="prescriptions" className="text-sm">Prescriptions</TabsTrigger>
          <TabsTrigger value="templates" className="text-sm">Templates</TabsTrigger>
        </TabsList>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="mt-4 space-y-4">
          {/* Patient selector */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Search Patient</Label>
                  <Input placeholder="Type patient name..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Select Patient</Label>
                  <Select value={selectedPatientId ? selectedPatientId.toString() : ""} onValueChange={(v) => setSelectedPatientId(parseInt(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a patient" /></SelectTrigger>
                    <SelectContent>
                      {patientsData?.data?.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {!selectedPatientId ? (
            <div className="text-center py-16 text-muted-foreground">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a patient to view prescriptions</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
          ) : (prescriptions?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No prescriptions for this patient</p>
              {canManage && <Button size="sm" className="mt-4 gap-2" onClick={() => setShowCreate(true)}><Plus className="w-3 h-3" /> Create First Prescription</Button>}
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions?.map((rx) => (
                <Card key={rx.id} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">{format(new Date(rx.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                        </div>
                        <div className="space-y-2">
                          {Array.isArray(rx.medications) && rx.medications.map((med: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                              <Pill className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{med.medicine}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 border">{med.dose}</Badge>
                                  <Badge className="text-xs bg-green-50 text-green-700 border-green-200 border">{med.frequency}</Badge>
                                  <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 border">{med.duration}</Badge>
                                </div>
                                {med.instructions && <p className="text-xs text-muted-foreground mt-1">{med.instructions}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                        {rx.notes && <p className="text-sm text-muted-foreground mt-3 italic">Note: {rx.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={() => setPrintRxId(rx.id)}>
                          <Printer className="w-3.5 h-3.5" /> Print
                        </Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(rx.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          {loadingTemplates ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (templates?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm mt-1">Save frequently used prescriptions as templates for quick reuse</p>
              {canManage && <Button size="sm" className="mt-4 gap-2" onClick={() => setShowTemplate(true)}><Plus className="w-3 h-3" /> Create Template</Button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates?.map((t) => (
                <Card key={t.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{t.name}</p>
                          {t.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{Array.isArray(t.medications) ? t.medications.length : 0} medication(s)</p>
                        <div className="mt-2 space-y-1">
                          {Array.isArray(t.medications) && t.medications.slice(0, 2).map((m: any, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">• {m.medicine} — {m.dose} · {m.frequency}</p>
                          ))}
                          {Array.isArray(t.medications) && t.medications.length > 2 && (
                            <p className="text-xs text-muted-foreground">+{t.medications.length - 2} more</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => loadTemplate(t)}>Use</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={t.isFavorite ? "Remove favorite" : "Add to favorites"} onClick={() => toggleFavMutation.mutate({ id: t.id, isFavorite: !t.isFavorite })}>
                          {t.isFavorite ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTemplateId(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Prescription Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => setShowCreate(v)}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pill className="w-5 h-5 text-primary" /> New Prescription</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Patient */}
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={selectedPatientId ? selectedPatientId.toString() : ""} onValueChange={(v) => setSelectedPatientId(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patientsData?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Medications *</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addMed}><Plus className="w-3 h-3" /> Add</Button>
              </div>
              <div className="space-y-4">
                {medications.map((med, i) => (
                  <div key={i} className="p-3 border border-border rounded-lg space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">دواء {i + 1}</p>
                      {medications.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMed(i)}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Medicine Name *</Label><Input value={med.medicine} onChange={(e) => updateMed(i, "medicine", e.target.value)} placeholder="e.g. Amoxicillin" className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Dose *</Label><Input value={med.dose} onChange={(e) => updateMed(i, "dose", e.target.value)} placeholder="e.g. 500mg" className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Frequency *</Label><Input value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} placeholder="e.g. 3x daily" className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Duration *</Label><Input value={med.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} placeholder="e.g. 7 days" className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Instructions</Label><Input value={med.instructions} onChange={(e) => updateMed(i, "instructions", e.target.value)} placeholder="e.g. Take after meals" className="h-8 text-sm" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional instructions or notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? "Creating..." : "Create Prescription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showTemplate} onOpenChange={(v) => setShowTemplate(v)}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookTemplate className="w-5 h-5 text-primary" /> Save Prescription Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Template Name *</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Antibiotic Course" /></div>
              <div className="flex items-end">
                <Button variant={templateFavorite ? "default" : "outline"} className="gap-2 h-9" onClick={() => setTemplateFavorite(!templateFavorite)}>
                  {templateFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                  {templateFavorite ? "Favorite" : "Add to Favorites"}
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Medications *</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTemplateMed}><Plus className="w-3 h-3" /> Add</Button>
              </div>
              <div className="space-y-4">
                {templateMeds.map((med, i) => (
                  <div key={i} className="p-3 border border-border rounded-lg space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">دواء {i + 1}</p>
                      {templateMeds.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTemplateMed(i)}><X className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1"><Label className="text-xs">اسم الدواء *</Label><Input value={med.medicine} onChange={(e) => updateTemplateMed(i, "medicine", e.target.value)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">الجرعة *</Label><Input value={med.dose} onChange={(e) => updateTemplateMed(i, "dose", e.target.value)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">التكرار *</Label><Input value={med.frequency} onChange={(e) => updateTemplateMed(i, "frequency", e.target.value)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">المدة *</Label><Input value={med.duration} onChange={(e) => updateTemplateMed(i, "duration", e.target.value)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">تعليمات</Label><Input value={med.instructions} onChange={(e) => updateTemplateMed(i, "instructions", e.target.value)} className="h-8 text-sm" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplate(false)}>Cancel</Button>
            <Button onClick={() => { if (!templateName) { toast.error("Template name required"); return; } createTemplateMutation.mutate({ name: templateName, medications: templateMeds, isFavorite: templateFavorite }); }} disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Prescription Dialog */}
      <Dialog open={!!printRxId} onOpenChange={(v) => !v && setPrintRxId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader><DialogTitle>Prescription</DialogTitle></DialogHeader>
          {printRx && (
            <div ref={printRef} className="space-y-4 py-2">
              <div className="border-b pb-3">
                <p className="font-bold text-lg">Medical Prescription</p>
                <p className="text-sm text-muted-foreground">Date: {format(new Date(printRx.createdAt), "MMMM d, yyyy")}</p>
                <p className="text-sm text-muted-foreground">Patient ID: #{printRx.patientId}</p>
              </div>
              <div className="space-y-3">
                {Array.isArray(printRx.medications) && printRx.medications.map((med: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-bold text-primary text-lg leading-none mt-0.5">℞</span>
                    <div>
                      <p className="font-semibold">{med.medicine}</p>
                      <p className="text-sm text-muted-foreground">{med.dose} — {med.frequency} — {med.duration}</p>
                      {med.instructions && <p className="text-xs text-muted-foreground italic">{med.instructions}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {printRx.notes && <div className="border-t pt-3"><p className="text-sm"><span className="font-medium">Notes:</span> {printRx.notes}</p></div>}
              <div className="border-t pt-3 flex justify-between text-xs text-muted-foreground">
                <span>Prescription #{printRx.id}</span>
                <span>Doctor's Signature: _______________</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintRxId(null)}>Close</Button>
            <Button className="gap-2" onClick={handlePrint}><Printer className="w-4 h-4" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Prescription */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-destructive" /> Delete Prescription?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This prescription will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template */}
      <Dialog open={!!deleteTemplateId} onOpenChange={(v) => !v && setDeleteTemplateId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-destructive" /> Delete Template?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This template will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTemplateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTemplateId && deleteTemplateMutation.mutate({ id: deleteTemplateId })} disabled={deleteTemplateMutation.isPending}>
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
