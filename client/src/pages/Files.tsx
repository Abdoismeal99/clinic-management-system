import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useCallback } from "react";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Upload, Trash2, Download, Eye, Image, X, CloudUpload, PenLine } from "lucide-react";
import ImageAnnotator from "@/components/ImageAnnotator";
import { format } from "date-fns";
import { FILE_CATEGORY_LABELS } from "@/lib/types";

export default function Files() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const prePatientId = params.get("patientId") ? parseInt(params.get("patientId")!) : 0;
  const [patientId, setPatientId] = useState(prePatientId);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [annotateUrl, setAnnotateUrl] = useState<string | null>(null);
  const [annotateName, setAnnotateName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: patients } = trpc.patients.list.useQuery({ limit: 200 });
  const { data: files, isLoading } = trpc.files.byPatient.useQuery({ patientId: patientId || 0, category: categoryFilter || undefined }, { enabled: patientId > 0 });
  const getUrlQuery = trpc.files.getPresignedUrl.useQuery({ id: 0 }, { enabled: false });
  const getUploadUrlMutation = trpc.files.getUploadUrl.useMutation();
  const confirmUploadMutation = trpc.files.confirmUpload.useMutation();
  const deleteMutation = trpc.files.delete.useMutation({ onSuccess: () => { toast.success("File deleted"); utils.files.byPatient.invalidate(); }, onError: (e) => toast.error(e.message) });
  const canUpload = user?.role === "admin" || user?.role === "doctor";
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setShowUpload(true); } }, []);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setShowUpload(true); } };
  const handleUpload = async () => {
    if (!uploadFile || !patientId) { toast.error("Select a patient and file"); return; }
    setUploading(true);
    try {
      const { id, fileKey } = await getUploadUrlMutation.mutateAsync({ patientId, fileName: uploadFile.name, mimeType: uploadFile.type, fileSize: uploadFile.size, category: uploadCategory as any, description: uploadDescription || undefined });
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        await confirmUploadMutation.mutateAsync({ id, fileKey, fileContent: base64, mimeType: uploadFile.type });
        toast.success("File uploaded successfully");
        utils.files.byPatient.invalidate();
        setShowUpload(false);
        setUploadFile(null);
        setUploadDescription("");
      };
      reader.readAsDataURL(uploadFile);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);
  const handleAnnotate = async (fileId: number, name: string) => {
    try {
      const result = await utils.files.getPresignedUrl.fetch({ id: fileId });
      setAnnotateUrl(result.url);
      setAnnotateName(name);
    } catch { toast.error("Could not load file for annotation"); }
  };
  const handlePreview = async (fileId: number, name: string) => {
    try {
      const result = await utils.files.getPresignedUrl.fetch({ id: fileId });
      setPreviewUrl(result.url);
      setPreviewName(name);
    } catch {
      toast.error("Could not load file preview");
    }
  };
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-600" />;
    return <FileText className="w-5 h-5 text-blue-600" />;
  };
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Medical Files</h1><p className="text-sm text-muted-foreground mt-0.5">Securely stored patient files and documents</p></div>
        {canUpload && <Button onClick={() => setShowUpload(true)} size="sm" className="gap-2 h-9"><Upload className="w-4 h-4" /> Upload File</Button>}
      </div>
      <div className="flex gap-3 flex-wrap">
        <Select value={patientId.toString()} onValueChange={(v) => setPatientId(parseInt(v))}>
          <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Select patient" /></SelectTrigger>
          <SelectContent>{patients?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}</SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{Object.entries(FILE_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {!patientId ? (
        <div className="text-center py-16 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Select a patient to view their files</p></div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : files?.length === 0 ? (
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}>
          <CloudUpload className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">No files yet</p>
          <p className="text-sm text-muted-foreground mt-1">Drag & drop files here or click Upload</p>
          {canUpload && <Button onClick={() => setShowUpload(true)} className="mt-4 gap-2" size="sm"><Upload className="w-4 h-4" /> Upload File</Button>}
        </div>
      ) : (
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-all ${isDragging ? "ring-2 ring-primary ring-offset-2 rounded-xl" : ""}`}>
          {files?.map((f) => (
            <Card key={f.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">{getFileIcon(f.mimeType ?? "")}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f.originalName}</p>
                    <Badge className="text-xs mt-1 bg-muted text-muted-foreground border-0">{FILE_CATEGORY_LABELS[f.category as keyof typeof FILE_CATEGORY_LABELS] ?? f.category}</Badge>
                    {f.description && <p className="text-xs text-muted-foreground mt-1 truncate">{f.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(f.createdAt), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  {f.presignedUrl && <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-1" onClick={() => handlePreview(f.id, f.originalName)}><Eye className="w-3 h-3" /> Preview</Button>}
                  {f.presignedUrl && isImageFile(f.originalName) && <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" title="Annotate image" onClick={() => handleAnnotate(f.id, f.originalName)}><PenLine className="w-3 h-3" /></Button>}
                  {f.presignedUrl && <a href={f.presignedUrl} download={f.originalName} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Download className="w-3 h-3" /></Button></a>}
                  {canUpload && <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: f.id })}><Trash2 className="w-3 h-3" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(v) => { setShowUpload(v); if (!v) setUploadFile(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Medical File</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label><Select value={patientId.toString()} onValueChange={(v) => setPatientId(parseInt(v))}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{patients?.data?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.fullName} ({p.patientId})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5">
              <Label>File *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
                {uploadFile ? <div className="flex items-center gap-2 justify-center"><FileText className="w-4 h-4 text-primary" /><span className="text-sm font-medium">{uploadFile.name}</span><Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}><X className="w-3 h-3" /></Button></div>
                : <><CloudUpload className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" /><p className="text-sm text-muted-foreground">Click to select or drag & drop</p></>}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" />
            </div>
            <div className="space-y-1.5"><Label>Category</Label><Select value={uploadCategory} onValueChange={setUploadCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FILE_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Optional description" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button><Button onClick={handleUpload} disabled={uploading || !uploadFile}>{uploading ? "Uploading..." : "Upload"}</Button></DialogFooter>
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

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="truncate">{previewName}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewUrl && (previewUrl.includes("image") || previewName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
              <img src={previewUrl} alt={previewName} className="max-w-full rounded-lg" />
            ) : previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border" title={previewName} />
            ) : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPreviewUrl(null)}>Close</Button>{previewUrl && <a href={previewUrl} download={previewName} target="_blank" rel="noreferrer"><Button className="gap-2"><Download className="w-4 h-4" /> Download</Button></a>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
