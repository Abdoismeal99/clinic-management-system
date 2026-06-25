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
import { Users, Plus, Search, Eye, Pencil, Trash2, Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { STATUS_CLASSES, STATUS_LABELS, BLOOD_TYPES, canManagePatients, canDelete } from "@/lib/types";

const EMPTY_FORM = { fullName: "", gender: "male" as const, dateOfBirth: "", phone: "", address: "", occupation: "", bloodType: "unknown" as const, allergies: "", chronicDiseases: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "", medicalNotes: "", status: "new" as const };

export default function Patients() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = trpc.patients.list.useQuery({ search: search || undefined, status: statusFilter || undefined, gender: genderFilter || undefined, page, limit: 15 });
  const createMutation = trpc.patients.create.useMutation({ onSuccess: () => { toast.success("Patient created"); utils.patients.list.invalidate(); setShowForm(false); setForm({ ...EMPTY_FORM }); }, onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.patients.update.useMutation({ onSuccess: () => { toast.success("Patient updated"); utils.patients.list.invalidate(); setShowForm(false); setEditId(null); }, onError: (e) => toast.error(e.message) });
  const deleteMutation = trpc.patients.delete.useMutation({ onSuccess: () => { toast.success("Patient archived"); utils.patients.list.invalidate(); setDeleteId(null); }, onError: (e) => toast.error(e.message) });

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };
  const openEdit = (p: any) => { setForm({ fullName: p.fullName, gender: p.gender, dateOfBirth: p.dateOfBirth ? format(new Date(p.dateOfBirth), "yyyy-MM-dd") : "", phone: p.phone ?? "", address: p.address ?? "", occupation: p.occupation ?? "", bloodType: p.bloodType ?? "unknown", allergies: p.allergies ?? "", chronicDiseases: p.chronicDiseases ?? "", emergencyContactName: p.emergencyContactName ?? "", emergencyContactPhone: p.emergencyContactPhone ?? "", emergencyContactRelation: p.emergencyContactRelation ?? "", medicalNotes: p.medicalNotes ?? "", status: p.status }); setEditId(p.id); setShowForm(true); };
  const handleSubmit = () => { if (!form.fullName.trim()) { toast.error("Full name is required"); return; } if (editId) updateMutation.mutate({ id: editId, ...form }); else createMutation.mutate(form); };
  const role = user?.role ?? "user";
  const totalPages = Math.ceil((data?.total ?? 0) / 15);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Patients</h1><p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total patients</p></div>
        <div className="flex items-center gap-2">
          <Link href="/patients/archive"><Button variant="outline" size="sm" className="gap-2 h-9"><Archive className="w-4 h-4" /> Archive</Button></Link>
          {canManagePatients(role as any) && <Button onClick={openCreate} size="sm" className="gap-2 h-9 bg-primary hover:bg-primary-700"><Plus className="w-4 h-4" /> New Patient</Button>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search by name, ID, or phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" /></div>
        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}><SelectTrigger className="w-36 h-9"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="follow-up">Follow-up</SelectItem><SelectItem value="stable">Stable</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
        <Select value={genderFilter || "all"} onValueChange={(v) => { setGenderFilter(v === "all" ? "" : v); setPage(1); }}><SelectTrigger className="w-32 h-9"><SelectValue placeholder="All Gender" /></SelectTrigger><SelectContent><SelectItem value="all">All Gender</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : data?.data?.length === 0 ? <div className="text-center py-16 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium text-base">No patients found</p><p className="text-sm mt-1">{search ? "Try a different search term" : "Add your first patient"}</p>{canManagePatients(role as any) && !search && <Button onClick={openCreate} className="mt-4 gap-2" size="sm"><Plus className="w-4 h-4" /> Add Patient</Button>}</div>
        : <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/40"><th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th><th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">ID</th><th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Age</th><th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Phone</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th></tr></thead>
        <tbody className="divide-y divide-border">{data?.data?.map((p) => { const age = p.dateOfBirth ? differenceInYears(new Date(), new Date(p.dateOfBirth)) : null; return (<tr key={p.id} className="hover:bg-muted/30 transition-colors"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-sm font-semibold text-primary">{p.fullName.charAt(0)}</span></div><div><p className="font-medium text-foreground">{p.fullName}</p>{p.chronicDiseases && <p className="text-xs text-muted-foreground truncate max-w-48">{p.chronicDiseases}</p>}</div></div></td><td className="px-4 py-3 hidden sm:table-cell"><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.patientId}</span></td><td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{age !== null ? `${age} yrs` : "—"} · <span className="capitalize">{p.gender}</span></td><td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.phone ?? "—"}</td><td className="px-4 py-3"><Badge className={`text-xs border ${STATUS_CLASSES[p.status as keyof typeof STATUS_CLASSES] ?? ""}`}>{STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status}</Badge></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><Link href={`/patients/${p.id}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></Button></Link>{canManagePatients(role as any) && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>}{canDelete(role as any) && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4" /></Button>}</div></td></tr>); })}</tbody></table></div>
        {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-border"><p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data?.total} patients</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1"><ChevronLeft className="w-3 h-3" /> Prev</Button><Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-8 gap-1">Next <ChevronRight className="w-3 h-3" /></Button></div></div>}</>
        }
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Patient" : "New Patient"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5"><Label>Full Name *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Enter full name" /></div>
            <div className="space-y-1.5"><Label>Gender *</Label><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+966 5xx xxx xxxx" /></div>
            <div className="space-y-1.5"><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Blood Type</Label><Select value={form.bloodType} onValueChange={(v) => setForm({ ...form, bloodType: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BLOOD_TYPES.map((bt) => <SelectItem key={bt} value={bt}>{bt === "unknown" ? "Unknown" : bt}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="follow-up">Follow-up</SelectItem><SelectItem value="stable">Stable</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Allergies</Label><Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin" /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Chronic Diseases</Label><Input value={form.chronicDiseases} onChange={(e) => setForm({ ...form, chronicDiseases: e.target.value })} placeholder="e.g. Diabetes, Hypertension" /></div>
            <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Emergency Phone</Label><Input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Relation</Label><Input value={form.emergencyContactRelation} onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })} placeholder="e.g. Spouse" /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Medical Notes</Label><Textarea value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? "Saving..." : editId ? "Update" : "Create Patient"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Archive Patient?</DialogTitle><DialogDescription>This patient will be moved to the archive. You can restore them later.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Archiving..." : "Archive"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
