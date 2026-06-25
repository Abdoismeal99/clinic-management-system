import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { useState, useRef } from "react";

interface PatientPdfExportProps {
  patientId: number;
  patientName: string;
}

export default function PatientPdfExport({ patientId, patientName }: PatientPdfExportProps) {
  const [generating, setGenerating] = useState(false);
  const utils = trpc.useUtils();

  const handleExport = async () => {
    setGenerating(true);
    try {
      const data = await utils.patients.exportData.fetch({ id: patientId });
      generateAndPrintPdf(data);
    } catch (err) {
      toast.error("Failed to export patient file");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={generating}>
      {generating ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
      ) : (
        <><FileDown className="w-4 h-4 mr-2" />Export PDF</>
      )}
    </Button>
  );
}

function generateAndPrintPdf(data: any) {
  const { patient, visits, prescriptions, files, appointments } = data;

  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null;

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
  };

  const statusColors: Record<string, string> = {
    new: "#3b82f6",
    "follow-up": "#f59e0b",
    stable: "#10b981",
    critical: "#ef4444",
  };

  const statusColor = statusColors[patient.status ?? "new"] ?? "#6b7280";

  const visitsHtml = visits.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px;">No visits recorded</td></tr>`
    : visits.map((v: any) => `
      <tr>
        <td>${formatDate(v.visitDate)}</td>
        <td>${v.diagnosisText ?? "—"}</td>
        <td>${v.symptoms ?? "—"}</td>
        <td>${v.status ?? "—"}</td>
        <td>${v.followUpDate ? formatDate(v.followUpDate) : "—"}</td>
      </tr>`).join("");

  const prescriptionsHtml = prescriptions.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px;">No prescriptions recorded</td></tr>`
    : prescriptions.map((p: any) => {
        let meds: any[] = [];
        try { meds = typeof p.medicines === "string" ? JSON.parse(p.medicines) : (p.medicines ?? []); } catch {}
        return `
        <tr>
          <td>${formatDate(p.prescriptionDate)}</td>
          <td>${meds.map((m: any) => m.name ?? m.medicine ?? "").filter(Boolean).join(", ") || "—"}</td>
          <td>${meds.map((m: any) => `${m.dose ?? ""} ${m.frequency ?? ""}`).filter(Boolean).join("; ") || "—"}</td>
          <td>${p.notes ?? "—"}</td>
          <td>${p.status ?? "—"}</td>
        </tr>`;
      }).join("");

  const filesHtml = files.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:16px;">No files uploaded</td></tr>`
    : files.map((f: any) => `
      <tr>
        <td>${f.fileName ?? f.originalName ?? "—"}</td>
        <td>${f.category ?? "—"}</td>
        <td>${formatDate(f.createdAt)}</td>
      </tr>`).join("");

  const appointmentsHtml = appointments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:16px;">No appointments recorded</td></tr>`
    : appointments.map((a: any) => `
      <tr>
        <td>${formatDate(a.appointmentDate)}</td>
        <td>${a.time ?? "—"}</td>
        <td><span style="color:${a.status === 'completed' ? '#10b981' : a.status === 'cancelled' ? '#ef4444' : '#f59e0b'}">${a.status ?? "—"}</span></td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Patient File — ${patient.fullName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1f2937; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
  .clinic-name { font-size: 20px; font-weight: 700; color: #1d4ed8; }
  .clinic-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .patient-id { font-size: 11px; color: #6b7280; text-align: right; }
  .patient-id strong { font-size: 14px; color: #1f2937; display: block; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-item { display: flex; gap: 6px; }
  .info-label { color: #6b7280; font-weight: 500; min-width: 110px; }
  .info-value { color: #1f2937; font-weight: 400; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #fff; background: ${statusColor}; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .alert-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; }
  .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 16px; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="clinic-name">🏥 Clinic Management System</div>
      <div class="clinic-sub">Medical Information System — Confidential Patient Record</div>
    </div>
    <div class="patient-id">
      <strong>${patient.patientId ?? "—"}</strong>
      Patient ID
    </div>
  </div>

  <!-- Patient Info -->
  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Full Name:</span><span class="info-value">${patient.fullName}</span></div>
      <div class="info-item"><span class="info-label">Status:</span><span class="info-value"><span class="status-badge">${patient.status ?? "new"}</span></span></div>
      <div class="info-item"><span class="info-label">Gender:</span><span class="info-value">${patient.gender ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Date of Birth:</span><span class="info-value">${formatDate(patient.dateOfBirth)}${age !== null ? ` (${age} years)` : ""}</span></div>
      <div class="info-item"><span class="info-label">Phone:</span><span class="info-value">${patient.phone ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Address:</span><span class="info-value">${patient.address ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Occupation:</span><span class="info-value">${patient.occupation ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Blood Type:</span><span class="info-value">${patient.bloodType ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Registered:</span><span class="info-value">${formatDate(patient.createdAt)}</span></div>
    </div>
  </div>

  <!-- Medical Alerts -->
  ${(patient.allergies || patient.chronicDiseases) ? `
  <div class="section">
    <div class="section-title">Medical Alerts</div>
    ${patient.allergies ? `<div class="alert-box" style="margin-bottom:8px;"><strong>⚠ Allergies:</strong> ${patient.allergies}</div>` : ""}
    ${patient.chronicDiseases ? `<div class="alert-box" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b;"><strong>🩺 Chronic Diseases:</strong> ${patient.chronicDiseases}</div>` : ""}
  </div>` : ""}

  <!-- Emergency Contact -->
  ${patient.emergencyContactName ? `
  <div class="section">
    <div class="section-title">Emergency Contact</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span class="info-value">${patient.emergencyContactName}</span></div>
      <div class="info-item"><span class="info-label">Phone:</span><span class="info-value">${patient.emergencyContactPhone ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Relation:</span><span class="info-value">${patient.emergencyContactRelation ?? "—"}</span></div>
    </div>
  </div>` : ""}

  <!-- Medical Notes -->
  ${patient.medicalNotes ? `
  <div class="section">
    <div class="section-title">Medical Notes</div>
    <p style="color:#374151;line-height:1.6;">${patient.medicalNotes}</p>
  </div>` : ""}

  <!-- Visits -->
  <div class="section">
    <div class="section-title">Visit History (${visits.length} visits)</div>
    <table>
      <thead><tr><th>Date</th><th>Diagnosis</th><th>Symptoms</th><th>Status</th><th>Follow-up</th></tr></thead>
      <tbody>${visitsHtml}</tbody>
    </table>
  </div>

  <!-- Prescriptions -->
  <div class="section">
    <div class="section-title">Prescriptions (${prescriptions.length} records)</div>
    <table>
      <thead><tr><th>Date</th><th>Medicines</th><th>Dose / Frequency</th><th>Notes</th><th>Status</th></tr></thead>
      <tbody>${prescriptionsHtml}</tbody>
    </table>
  </div>

  <!-- Appointments -->
  <div class="section">
    <div class="section-title">Appointments (${appointments.length} records)</div>
    <table>
      <thead><tr><th>Date</th><th>Time</th><th>Status</th></tr></thead>
      <tbody>${appointmentsHtml}</tbody>
    </table>
  </div>

  <!-- Files -->
  <div class="section">
    <div class="section-title">Medical Files (${files.length} files)</div>
    <table>
      <thead><tr><th>File Name</th><th>Category</th><th>Uploaded</th></tr></thead>
      <tbody>${filesHtml}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}</span>
    <span>Clinic Management System — Confidential</span>
    <span>Patient: ${patient.fullName} (${patient.patientId ?? ""})</span>
  </div>
</div>
</body>
</html>`;

  // Open in new window and trigger print
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("Popup blocked. Please allow popups for this site.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}
