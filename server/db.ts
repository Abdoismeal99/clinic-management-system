import { and, asc, count, desc, eq, gte, ilike, isNull, like, lte, not, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  ActivityLog,
  Appointment,
  InsertUser,
  MedicalFile,
  Patient,
  Prescription,
  PrescriptionTemplate,
  Setting,
  User,
  Visit,
  activityLogs,
  appointments,
  diagnoses,
  medicalFiles,
  patients,
  prescriptionTemplates,
  prescriptions,
  settings,
  users,
  visits,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.name));
}

export async function getDoctors(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users)
    .where(and(eq(users.isActive, true), or(eq(users.role, "doctor"), eq(users.role, "admin"))))
    .orderBy(asc(users.name));
}

export async function updateUserProfile(userId: number, data: Partial<Pick<User, "name" | "email" | "specialty" | "phone" | "avatarUrl" | "role">>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Patients ─────────────────────────────────────────────────────────────────
export async function generatePatientId(): Promise<string> {
  const db = await getDb();
  if (!db) return `PT${Date.now()}`;
  const result = await db.select({ cnt: count() }).from(patients);
  const total = result[0]?.cnt ?? 0;
  return `PT${String(total + 1).padStart(5, "0")}`;
}

export async function createPatient(data: Omit<typeof patients.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(patients).values(data);
  return (result[0] as any).insertId;
}

export async function getPatients(opts: {
  search?: string; status?: string; gender?: string; isDeleted?: boolean;
  page?: number; limit?: number; doctorId?: number;
}): Promise<{ data: Patient[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { search, status, gender, isDeleted = false, page = 1, limit = 20 } = opts;

  const conditions = [eq(patients.isDeleted, isDeleted)];
  if (search) {
    conditions.push(or(
      like(patients.fullName, `%${search}%`),
      like(patients.patientId, `%${search}%`),
      like(patients.phone, `%${search}%`)
    )!);
  }
  if (status) conditions.push(eq(patients.status, status as any));
  if (gender) conditions.push(eq(patients.gender, gender as any));

  const where = and(...conditions);
  const [data, totalResult] = await Promise.all([
    db.select().from(patients).where(where).orderBy(desc(patients.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ cnt: count() }).from(patients).where(where),
  ]);
  return { data, total: totalResult[0]?.cnt ?? 0 };
}

export async function getPatientById(id: number): Promise<Patient | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return result[0];
}

export async function updatePatient(id: number, data: Partial<typeof patients.$inferInsert>, updatedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(patients).set({ ...data, updatedBy, updatedAt: new Date() }).where(eq(patients.id, id));
}

export async function softDeletePatient(id: number, deletedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(patients).set({ isDeleted: true, deletedAt: new Date(), deletedBy }).where(eq(patients.id, id));
}

export async function restorePatient(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(patients).set({ isDeleted: false, deletedAt: null, deletedBy: null }).where(eq(patients.id, id));
}

export async function getPatientCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ cnt: count() }).from(patients).where(eq(patients.isDeleted, false));
  return result[0]?.cnt ?? 0;
}

export async function getRecentPatients(limit = 5): Promise<Patient[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(patients).where(eq(patients.isDeleted, false)).orderBy(desc(patients.createdAt)).limit(limit);
}

// ─── Visits ───────────────────────────────────────────────────────────────────
export async function createVisit(data: Omit<typeof visits.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(visits).values(data);
  return (result[0] as any).insertId;
}

export async function getVisitsByPatient(patientId: number): Promise<Visit[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visits)
    .where(and(eq(visits.patientId, patientId), eq(visits.isDeleted, false)))
    .orderBy(desc(visits.visitDate));
}

export async function getVisitById(id: number): Promise<Visit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
  return result[0];
}

export async function updateVisit(id: number, data: Partial<typeof visits.$inferInsert>, updatedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(visits).set({ ...data, updatedBy, updatedAt: new Date() }).where(eq(visits.id, id));
}

export async function deleteVisit(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(visits).set({ isDeleted: true }).where(eq(visits.id, id));
}

export async function getRecentVisits(limit = 5): Promise<Visit[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visits).where(eq(visits.isDeleted, false)).orderBy(desc(visits.visitDate)).limit(limit);
}

export async function getVisitsPaginated(opts: {
  patientId?: number; doctorId?: number; status?: string;
  dateFrom?: Date; dateTo?: Date; page?: number; limit?: number;
}): Promise<{ data: Visit[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { patientId, doctorId, status, dateFrom, dateTo, page = 1, limit = 20 } = opts;
  const conditions = [eq(visits.isDeleted, false)];
  if (patientId) conditions.push(eq(visits.patientId, patientId));
  if (doctorId) conditions.push(eq(visits.doctorId, doctorId));
  if (status) conditions.push(eq(visits.status, status as any));
  if (dateFrom) conditions.push(gte(visits.visitDate, dateFrom));
  if (dateTo) conditions.push(lte(visits.visitDate, dateTo));
  const where = and(...conditions);
  const [data, totalResult] = await Promise.all([
    db.select().from(visits).where(where).orderBy(desc(visits.visitDate)).limit(limit).offset((page - 1) * limit),
    db.select({ cnt: count() }).from(visits).where(where),
  ]);
  return { data, total: totalResult[0]?.cnt ?? 0 };
}

export async function getFollowUpPatients(): Promise<Visit[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return db.select().from(visits)
    .where(and(eq(visits.isDeleted, false), gte(visits.followUpDate, now), lte(visits.followUpDate, nextWeek)))
    .orderBy(asc(visits.followUpDate)).limit(10);
}

// ─── Prescriptions ────────────────────────────────────────────────────────────
export async function createPrescription(data: Omit<typeof prescriptions.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(prescriptions).values(data);
  return (result[0] as any).insertId;
}

export async function getPrescriptionsByPatient(patientId: number): Promise<Prescription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.isDeleted, false)))
    .orderBy(desc(prescriptions.prescriptionDate));
}

export async function getPrescriptionById(id: number): Promise<Prescription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  return result[0];
}

export async function deletePrescription(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(prescriptions).set({ isDeleted: true }).where(eq(prescriptions.id, id));
}

// ─── Prescription Templates ───────────────────────────────────────────────────
export async function getTemplatesByDoctor(doctorId: number): Promise<PrescriptionTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(prescriptionTemplates)
    .where(eq(prescriptionTemplates.doctorId, doctorId))
    .orderBy(desc(prescriptionTemplates.isFavorite), asc(prescriptionTemplates.name));
}

export async function createTemplate(data: Omit<typeof prescriptionTemplates.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(prescriptionTemplates).values(data);
  return (result[0] as any).insertId;
}

export async function updateTemplate(id: number, data: Partial<typeof prescriptionTemplates.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(prescriptionTemplates).set({ ...data, updatedAt: new Date() }).where(eq(prescriptionTemplates.id, id));
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, id));
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export async function createAppointment(data: Omit<typeof appointments.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(appointments).values(data);
  return (result[0] as any).insertId;
}

export async function getAppointments(opts: {
  doctorId?: number; patientId?: number; status?: string;
  dateFrom?: Date; dateTo?: Date; page?: number; limit?: number;
}): Promise<{ data: Appointment[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { doctorId, patientId, status, dateFrom, dateTo, page = 1, limit = 20 } = opts;
  const conditions = [eq(appointments.isDeleted, false)];
  if (doctorId) conditions.push(eq(appointments.doctorId, doctorId));
  if (patientId) conditions.push(eq(appointments.patientId, patientId));
  if (status) conditions.push(eq(appointments.status, status as any));
  if (dateFrom) conditions.push(gte(appointments.appointmentDate, dateFrom));
  if (dateTo) conditions.push(lte(appointments.appointmentDate, dateTo));
  const where = and(...conditions);
  const [data, totalResult] = await Promise.all([
    db.select().from(appointments).where(where).orderBy(asc(appointments.appointmentDate)).limit(limit).offset((page - 1) * limit),
    db.select({ cnt: count() }).from(appointments).where(where),
  ]);
  return { data, total: totalResult[0]?.cnt ?? 0 };
}

export async function getAppointmentById(id: number): Promise<Appointment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result[0];
}

export async function updateAppointment(id: number, data: Partial<typeof appointments.$inferInsert>, updatedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(appointments).set({ ...data, updatedBy, updatedAt: new Date() }).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(appointments).set({ isDeleted: true }).where(eq(appointments.id, id));
}

export async function getTodayAppointmentCount(doctorId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const conditions = [
    eq(appointments.isDeleted, false),
    gte(appointments.appointmentDate, today),
    lte(appointments.appointmentDate, tomorrow),
  ];
  if (doctorId) conditions.push(eq(appointments.doctorId, doctorId));
  const result = await db.select({ cnt: count() }).from(appointments).where(and(...conditions));
  return result[0]?.cnt ?? 0;
}

// ─── Medical Files ────────────────────────────────────────────────────────────
export async function createMedicalFile(data: Omit<typeof medicalFiles.$inferInsert, "id" | "createdAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medicalFiles).values(data);
  return (result[0] as any).insertId;
}

export async function getFilesByPatient(patientId: number, category?: string): Promise<MedicalFile[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(medicalFiles.patientId, patientId), eq(medicalFiles.isDeleted, false)];
  if (category) conditions.push(eq(medicalFiles.category, category as any));
  return db.select().from(medicalFiles).where(and(...conditions)).orderBy(desc(medicalFiles.createdAt));
}

export async function getFileById(id: number): Promise<MedicalFile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(medicalFiles).where(eq(medicalFiles.id, id)).limit(1);
  return result[0];
}

export async function updateFileAnnotations(id: number, annotations: object): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(medicalFiles).set({ annotations }).where(eq(medicalFiles.id, id));
}

export async function deleteFile(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(medicalFiles).set({ isDeleted: true }).where(eq(medicalFiles.id, id));
}

// ─── Activity Logs ────────────────────────────────────────────────────────────
export async function logActivity(data: {
  userId: number; action: string; entityType?: string; entityId?: number;
  description?: string; metadata?: object;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values(data);
}

export async function getActivityLogs(opts: {
  userId?: number; entityType?: string; dateFrom?: Date; dateTo?: Date;
  page?: number; limit?: number;
}): Promise<{ data: ActivityLog[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { userId, entityType, dateFrom, dateTo, page = 1, limit = 20 } = opts;
  const conditions = [];
  if (userId) conditions.push(eq(activityLogs.userId, userId));
  if (entityType) conditions.push(eq(activityLogs.entityType, entityType));
  if (dateFrom) conditions.push(gte(activityLogs.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(activityLogs.createdAt, dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, totalResult] = await Promise.all([
    db.select().from(activityLogs).where(where).orderBy(desc(activityLogs.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ cnt: count() }).from(activityLogs).where(where),
  ]);
  return { data, total: totalResult[0]?.cnt ?? 0 };
}

export async function getRecentActivities(limit = 10): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

// ─── Diagnoses ────────────────────────────────────────────────────────────────
export async function getDiagnoses(): Promise<typeof diagnoses.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diagnoses).orderBy(asc(diagnoses.name));
}

export async function createDiagnosis(data: { name: string; category?: string; color?: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(diagnoses).values(data);
  return (result[0] as any).insertId;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Setting[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings);
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ─── Reports / Stats ──────────────────────────────────────────────────────────
export async function getMonthlyPatientStats(): Promise<Array<{ month: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count
    FROM patients
    WHERE isDeleted = false AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY month ORDER BY month ASC
  `);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ month: r.month, count: Number(r.count) }));
}

export async function getMonthlyVisitStats(): Promise<Array<{ month: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT DATE_FORMAT(visitDate, '%Y-%m') as month, COUNT(*) as count
    FROM visits
    WHERE isDeleted = false AND visitDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY month ORDER BY month ASC
  `);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ month: r.month, count: Number(r.count) }));
}

export async function getTopDiagnoses(limit = 10): Promise<Array<{ diagnosis: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT diagnosisText as diagnosis, COUNT(*) as count
    FROM visits
    WHERE isDeleted = false AND diagnosisText IS NOT NULL AND diagnosisText != ''
    GROUP BY diagnosisText ORDER BY count DESC LIMIT ${limit}
  `);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ diagnosis: r.diagnosis, count: Number(r.count) }));
}

export async function getDoctorStats(): Promise<Array<{ doctorId: number; visitCount: number; patientCount: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT doctorId, COUNT(*) as visitCount, COUNT(DISTINCT patientId) as patientCount
    FROM visits WHERE isDeleted = false
    GROUP BY doctorId ORDER BY visitCount DESC
  `);
  return ((result as unknown as any[][])[0]).map((r: any) => ({
    doctorId: r.doctorId, visitCount: Number(r.visitCount), patientCount: Number(r.patientCount),
  }));
}

export async function getPatientStatusStats(): Promise<Array<{ status: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT status, COUNT(*) as count FROM patients WHERE isDeleted = false GROUP BY status
  `);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ status: r.status, count: Number(r.count) }));
}

// ─── Global Search ────────────────────────────────────────────────────────────
export async function globalSearch(query: string): Promise<{
  patients: Patient[]; visits: Visit[]; prescriptions: Prescription[];
}> {
  const db = await getDb();
  if (!db) return { patients: [], visits: [], prescriptions: [] };
  const q = `%${query}%`;
  const [pats, vis, pres] = await Promise.all([
    db.select().from(patients).where(and(
      eq(patients.isDeleted, false),
      or(like(patients.fullName, q), like(patients.patientId, q), like(patients.phone, q), like(patients.chronicDiseases, q))
    )).limit(10),
    db.select().from(visits).where(and(
      eq(visits.isDeleted, false),
      or(like(visits.diagnosisText, q), like(visits.symptoms, q), like(visits.doctorNotes, q))
    )).limit(10),
    db.select().from(prescriptions).where(and(
      eq(prescriptions.isDeleted, false),
      sql`JSON_SEARCH(medications, 'one', ${query}) IS NOT NULL`
    )).limit(10),
  ]);
  return { patients: pats, visits: vis, prescriptions: pres };
}
