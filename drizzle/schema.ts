import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "doctor", "assistant"]).default("user").notNull(),
  specialty: varchar("specialty", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Patients ─────────────────────────────────────────────────────────────────
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  patientId: varchar("patientId", { length: 16 }).notNull().unique(),
  fullName: varchar("fullName", { length: 256 }).notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other"]).notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  occupation: varchar("occupation", { length: 128 }),
  bloodType: mysqlEnum("bloodType", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).default("unknown"),
  allergies: text("allergies"),
  chronicDiseases: text("chronicDiseases"),
  emergencyContactName: varchar("emergencyContactName", { length: 256 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 32 }),
  emergencyContactRelation: varchar("emergencyContactRelation", { length: 64 }),
  medicalNotes: text("medicalNotes"),
  status: mysqlEnum("status", ["new", "follow-up", "stable", "critical"]).default("new").notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_patients_fullName").on(t.fullName),
  index("idx_patients_phone").on(t.phone),
  index("idx_patients_status").on(t.status),
  index("idx_patients_isDeleted").on(t.isDeleted),
]);

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

// ─── Diagnoses / Tags ─────────────────────────────────────────────────────────
export const diagnoses = mysqlTable("diagnoses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  category: varchar("category", { length: 64 }),
  color: varchar("color", { length: 16 }).default("#3B82F6"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Diagnosis = typeof diagnoses.$inferSelect;

// ─── Visits ───────────────────────────────────────────────────────────────────
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId").notNull(),
  visitDate: timestamp("visitDate").notNull(),
  chiefComplaint: text("chiefComplaint"),
  symptoms: text("symptoms"),
  diagnosisText: text("diagnosisText"),
  diagnosisTags: json("diagnosisTags").$type<string[]>().default([]),
  // Vital Signs
  bloodPressureSystolic: int("bloodPressureSystolic"),
  bloodPressureDiastolic: int("bloodPressureDiastolic"),
  heartRate: int("heartRate"),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  weight: decimal("weight", { precision: 5, scale: 1 }),
  height: decimal("height", { precision: 5, scale: 1 }),
  oxygenSaturation: int("oxygenSaturation"),
  respiratoryRate: int("respiratoryRate"),
  // Notes & Follow-up
  doctorNotes: text("doctorNotes"),
  followUpDate: timestamp("followUpDate"),
  followUpNotes: text("followUpNotes"),
  status: mysqlEnum("status", ["scheduled", "in-progress", "completed", "cancelled"]).default("completed").notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_visits_patientId").on(t.patientId),
  index("idx_visits_doctorId").on(t.doctorId),
  index("idx_visits_visitDate").on(t.visitDate),
]);

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  visitId: int("visitId"),
  doctorId: int("doctorId").notNull(),
  prescriptionDate: timestamp("prescriptionDate").defaultNow().notNull(),
  medications: json("medications").$type<Array<{
    medicine: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>().notNull(),
  notes: text("notes"),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_prescriptions_patientId").on(t.patientId),
  index("idx_prescriptions_visitId").on(t.visitId),
]);

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

// ─── Prescription Templates ───────────────────────────────────────────────────
export const prescriptionTemplates = mysqlTable("prescriptionTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  doctorId: int("doctorId").notNull(),
  medications: json("medications").$type<Array<{
    medicine: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>().notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId").notNull(),
  appointmentDate: timestamp("appointmentDate").notNull(),
  duration: int("duration").default(30),
  reason: text("reason"),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "completed", "cancelled", "no-show"]).default("pending").notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_appointments_patientId").on(t.patientId),
  index("idx_appointments_doctorId").on(t.doctorId),
  index("idx_appointments_date").on(t.appointmentDate),
]);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Medical Files ────────────────────────────────────────────────────────────
export const medicalFiles = mysqlTable("medicalFiles", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  visitId: int("visitId"),
  uploadedBy: int("uploadedBy").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  originalName: varchar("originalName", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl"),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: int("fileSize"),
  category: mysqlEnum("category", ["lab", "xray", "mri", "ct", "ultrasound", "report", "prescription", "other"]).default("other").notNull(),
  description: text("description"),
  annotations: json("annotations").$type<object>(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_files_patientId").on(t.patientId),
  index("idx_files_visitId").on(t.visitId),
  index("idx_files_category").on(t.category),
]);

export type MedicalFile = typeof medicalFiles.$inferSelect;
export type InsertMedicalFile = typeof medicalFiles.$inferInsert;

// ─── Activity Logs ────────────────────────────────────────────────────────────
export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_activity_userId").on(t.userId),
  index("idx_activity_entityType").on(t.entityType),
  index("idx_activity_createdAt").on(t.createdAt),
]);

export type ActivityLog = typeof activityLogs.$inferSelect;

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
