import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pill, Plus, Trash2, Star, StarOff } from "lucide-react";
import type { Medication } from "@/lib/types";

const EMPTY_MED: Medication = { medicine: "", dose: "", frequency: "", duration: "", instructions: "" };

export default function Prescriptions() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const prePatientId = params.get("patientId") ? parseInt(params.get("patientId")!) : 0;
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [patientId, setPatientId] = useState(prePatientId);
  const [medications, setMedications] = useState<Medication[]>([{ ...EMPTY_MED }]);
  const [notes, setNotes] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateMeds, setTemplateMeds] = useState<Medication[]>([{ ...EMPTY_MED }]);
  const [templateFav, setTemplateFav] = useState(false);
  const { data: patients } = trpc.patients.list.useQuery({ limit: 200 });
  const { data: templates } = trpc.prescriptions.templates.useQuery();
  const createMutation = trpc.prescriptions.create.useMutation({ onSuccess: () => { toast.success("Prescription created"); utils.prescriptions.byPatient.invalidate(); setShowForm(false); setMedications([{ ...EMPTY_MED }]); setNotes(""); }, onError: (e) => toast.error(e.message) });
  const deleteTemplateMutation = trpc.prescriptions.deleteTemplate.useMutation({ onSuccess: () => { toast.success("Template deleted"); utils.prescriptions.templates.invalidate(); }, onError: (e) => toast.error(e.message) });
  const createTemplateMutation = trpc.prescriptions.createTemplate.useMutation({ onSuccess: () => { toast.success("Template saved"); utils.prescriptions.templates.invalidate(); setShowTemplateForm(false); setTemplateName(""); setTemplateMeds([{ ...EMPTY_MED }]); }, onError: (e) => toast.error(e.message) });
  const toggleFavMutation = trpc.prescriptions.updateTemplate.useMutation({ onSuccess: () => utils.prescriptions.templates.invalidate() });
  const updateMed = (arr: Medication[], setArr: (v: Medication[]) => void, idx: number, field: keyof Medication, val: string) => { const next = [...arr]; next[idx] = { ...next[idx], [field]: val }; setArr(next); };
  const addMed = (arr: Medication[], setArr: (v: Medication[]) => void) => setArr([...arr, { ...EMPTY_MED }]);
  const removeMed = (arr: Medication[], setArr: (v: Medication[]) => void, idx: number) => setArr(arr.filter((_, i) => i !== idx));
  const applyTemplate = (t: any) => { setMedications(t.medications); setShowForm(true); };
  const canCreate = user?.role === "admin" || user?.role === "doctor";
  const MedFields = ({ arr, setArr }: { arr: Medication[]; setArr: (v: Medication[]) => void }) => (
    <div className="space-y-3">
      {arr.map((m, i) => (
        <div key={i} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Medication {i + 1}</span>{arr.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMed(arr, setArr, i)}><Trash2 className="w-3 h-3" /></Button>}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs">Medicine *</Label><Input value={m.medicine} onChange={(e) => updateMed(arr, setArr, i, "medicine", e.target.value)} placeholder="e.g. Amoxicillin" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Dose *</Label><Input value={m.dose} onChange={(e) => updateMed(arr, setArr, i, "dose", e.target.value)} placeholder="500mg" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Frequency *</Label><Input value={m.frequency} onChange={(e) => updateMed(arr, setArr, i, "frequency", e.target.value)} placeholder="3x daily" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Duration *</Label><Input value={m.duration} onChange={(e) => updateMed(arr, setArr, i, "duration", e.target.value)} placeholder="7 days" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Instructions</Label><Input value={m.instructions} onChange={(e) => updateMed(arr, setArr, i, "instructions", e.target.value)} placeholder="After meals" className="h-8 text-sm" /></div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full h-8 gap-1 text-xs" onClick={() => addMed(arr, setArr)}><Plus className="w-3 h-3" /> Add Medication</Button>
    </div>
  );
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Prescriptions</h1><p className="text-sm text-muted-foreground mt-0.5">Manage prescriptions and templates</p></div>
        {canCreate && <Button onClick={() => setShowTemplateForm(true)} size="sm" variant="outline" className="gap-2 h-9"><Plus className="w-4 h-4" /> Save Template</Button>}
      </div>
      <Tabs defaultValue="templates">
        <TabsList><TabsTrigger value="templates">Templates ({templates?.length ?? 0})</TabsTrigger><TabsTrigger value="new">New Prescription</TabsTrigger></TabsList>
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates?.map((t) => (
              <Card key={t.id} className="card-hover">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavMutation.mutate({ id: t.id, isFavorite: !t.isFavorite })}>{t.isFavorite ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplateMutation.mutate({ id: t.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {Array.isArray(t.medications) && (t.medications as any[]).slice(0, 3).map((m, i) => (<div key={i} className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Pill className="w-3 h-3 text-primary" /><span className="font-medium text-foreground">{m.medicine}</span><span>{m.dose}</span></div>))}
                  <Button size="sm" className="w-full mt-3 h-7 text-xs" onClick={() => applyTemplate(t)}>Use Template</Button>
                </CardContent>
              </Card>
            ))}
            {templates?.length === 0 && <div className="col-span-3 text-center py-10 text-muted-foreground"><Pill className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No templates saved yet</p></div>}
          </div>
        </TabsContent>
        <TabsContent value="new" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <div className="space-y-1.5"><Label>Patient *</Label><Select value={patientId.toString()} onValueChange={(v) => setPatientId(parseInt(v))}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{patients?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}</SelectContent></Select></div>
            <MedFields arr={medications} setArr={setMedications} />
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional instructions..." /></div>
            <Button onClick={() => { if (!patientId) { toast.error("Select a patient"); return; } const invalid = medications.some(m => !m.medicine || !m.dose || !m.frequency || !m.duration); if (invalid) { toast.error("Fill all required medication fields"); return; } createMutation.mutate({ patientId, medications, notes: notes || undefined }); }} disabled={createMutation.isPending} className="w-full">{createMutation.isPending ? "Creating..." : "Create Prescription"}</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Prescription from Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label><Select value={patientId.toString()} onValueChange={(v) => setPatientId(parseInt(v))}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{patients?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}</SelectContent></Select></div>
            <MedFields arr={medications} setArr={setMedications} />
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => { if (!patientId) { toast.error("Select a patient"); return; } createMutation.mutate({ patientId, medications, notes: notes || undefined }); }} disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Save Prescription Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Template Name *</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Antibiotic Course" /></div>
            <MedFields arr={templateMeds} setArr={setTemplateMeds} />
            <div className="flex items-center gap-2"><input type="checkbox" id="fav" checked={templateFav} onChange={(e) => setTemplateFav(e.target.checked)} className="w-4 h-4" /><Label htmlFor="fav">Mark as favorite</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowTemplateForm(false)}>Cancel</Button><Button onClick={() => { if (!templateName) { toast.error("Enter a template name"); return; } createTemplateMutation.mutate({ name: templateName, medications: templateMeds, isFavorite: templateFav }); }} disabled={createTemplateMutation.isPending}>{createTemplateMutation.isPending ? "Saving..." : "Save Template"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
