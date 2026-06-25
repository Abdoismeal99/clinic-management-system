export type UserRole = "user" | "admin" | "doctor" | "assistant";

export type PatientStatus = "new" | "follow-up" | "stable" | "critical";
export type AppointmentStatus = "pending" | "completed" | "cancelled" | "no-show";
export type VisitStatus = "scheduled" | "in-progress" | "completed" | "cancelled";
export type FileCategory = "lab" | "xray" | "mri" | "ct" | "ultrasound" | "report" | "prescription" | "other";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";

export interface Medication {
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const STATUS_LABELS: Record<PatientStatus, string> = {
  "new": "New",
  "follow-up": "Follow-up",
  "stable": "Stable",
  "critical": "Critical",
};

export const STATUS_CLASSES: Record<PatientStatus, string> = {
  "new": "status-new",
  "follow-up": "status-follow-up",
  "stable": "status-stable",
  "critical": "status-critical",
};

export const APPT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  "pending": "Pending",
  "completed": "Completed",
  "cancelled": "Cancelled",
  "no-show": "No Show",
};

export const APPT_STATUS_CLASSES: Record<AppointmentStatus, string> = {
  "pending": "appt-pending",
  "completed": "appt-completed",
  "cancelled": "appt-cancelled",
  "no-show": "appt-no-show",
};

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  "lab": "Lab Result",
  "xray": "X-Ray",
  "mri": "MRI",
  "ct": "CT Scan",
  "ultrasound": "Ultrasound",
  "report": "Medical Report",
  "prescription": "Prescription",
  "other": "Other",
};

export const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

export function canManagePatients(role: UserRole): boolean {
  return role === "admin" || role === "doctor" || role === "assistant";
}

export function canManageVisits(role: UserRole): boolean {
  return role === "admin" || role === "doctor";
}

export function canDelete(role: UserRole): boolean {
  return role === "admin" || role === "doctor";
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}
