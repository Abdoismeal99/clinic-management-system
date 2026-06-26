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
  tenants,
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

// ─── Tenant Helper ─────────────────────────────────────────────────────────
export async function getTenantId(email: string | null | undefined): Promise<number | null> {
  if (!email) return null;
  const ADMIN_EMAIL = "abdoismeal012@gmail.com";
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return 1;
  const db = await getDb();
  if (!db) return null;
  const { eq } = await import("drizzle-orm");
  // First try to get tenantId directly from users table (fast path)
  const userResult = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.email, email)).limit(1);
  if (userResult[0]?.tenantId) return userResult[0].tenantId;
  // Fallback: check if email matches a tenant's email (for clinic_admin first login)
  const tenantResult = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.email, email)).limit(1);
  return tenantResult[0]?.id ?? null;
}

// Link a user to a tenant (called when clinic admin activates their account)
export async function linkUserToTenant(userId: number, tenantId: number, tenantRole: "clinic_admin" | "staff"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ tenantId, tenantRole }).where(eq(users.id, userId));
}

// Get all users belonging to a specific tenant
export async function getUsersByTenant(tenantId: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))).orderBy(asc(users.name));
}

// Get all unassigned users (no tenant yet)
export async function getUnassignedUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  const { isNull } = await import("drizzle-orm");
  return db.select().from(users).where(and(isNull(users.tenantId), eq(users.isActive, true))).orderBy(asc(users.name));
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

  // Auto-link to tenant if email matches a tenant and user has no tenantId yet
  if (user.email) {
    const existing = await db.select({ id: users.id, tenantId: users.tenantId }).from(users).where(eq(users.openId, user.openId)).limit(1);
    const existingUser = existing[0];
    if (existingUser && !existingUser.tenantId) {
      // Check if this email matches a tenant
      const tenantMatch = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.email, user.email)).limit(1);
      if (tenantMatch[0]) {
        await db.update(users).set({ tenantId: tenantMatch[0].id, tenantRole: "clinic_admin" }).where(eq(users.id, existingUser.id));
      }
    }
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers(tenantId?: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  if (tenantId !== undefined) {
    return db.select().from(users).where(and(eq(users.isActive, true), eq(users.tenantId, tenantId))).orderBy(asc(users.name));
  }
  return db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.name));
}

export async function getDoctors(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users)
    .where(and(eq(users.isActive, true), or(eq(users.role, "doctor"), eq(users.role, "admin"))))
    .orderBy(asc(users.name));
}

export async function updateUserProfile(userId: number, data: Partial<Pick<User, "name" | "email" | "specialty" | "phone" | "avatarUrl" | "role" | "tenantId" | "tenantRole">>): Promise<void> {
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
  search?: string; status?: string; gender?: string; tag?: string; isDeleted?: boolean;
  page?: number; limit?: number; doctorId?: number; tenantId?: number;
}): Promise<{ data: Patient[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { search, status, gender, tag, isDeleted = false, page = 1, limit = 20, tenantId } = opts;
  const conditions = [eq(patients.isDeleted, isDeleted)];
  if (tenantId) conditions.push(eq(patients.tenantId, tenantId));
  if (search) {
    conditions.push(or(
      like(patients.fullName, `%${search}%`),
      like(patients.patientId, `%${search}%`),
      like(patients.phone, `%${search}%`)
    )!);
  }
  if (status) conditions.push(eq(patients.status, status as any));
  if (gender) conditions.push(eq(patients.gender, gender as any));
  if (tag) conditions.push(like(patients.tags, `%${tag}%`));

  const where = and(...conditions);
  const [data, totalResult] = await Promise.all([
    db.select().from(patients).where(where).orderBy(desc(patients.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ cnt: count() }).from(patients).where(where),
  ]);
  return { data, total: totalResult[0]?.cnt ?? 0 };
}

export async function getPatientById(id: number, tenantId?: number): Promise<Patient | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const conds = tenantId ? and(eq(patients.id, id), eq(patients.tenantId, tenantId)) : eq(patients.id, id);
  const result = await db.select().from(patients).where(conds).limit(1);
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

export async function getPatientCount(tenantId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cond = tenantId ? and(eq(patients.isDeleted, false), eq(patients.tenantId, tenantId)) : eq(patients.isDeleted, false);
  const result = await db.select({ cnt: count() }).from(patients).where(cond);
  return result[0]?.cnt ?? 0;
}

export async function getRecentPatients(limit = 5, tenantId?: number): Promise<Patient[]> {
  const db = await getDb();
  if (!db) return [];
  const cond = tenantId ? and(eq(patients.isDeleted, false), eq(patients.tenantId, tenantId)) : eq(patients.isDeleted, false);
  return db.select().from(patients).where(cond).orderBy(desc(patients.createdAt)).limit(limit);
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

export async function getRecentVisits(limit = 5, tenantId?: number): Promise<Visit[]> {
  const db = await getDb();
  if (!db) return [];
  const cond = tenantId ? and(eq(visits.isDeleted, false), eq(visits.tenantId, tenantId)) : eq(visits.isDeleted, false);
  return db.select().from(visits).where(cond).orderBy(desc(visits.visitDate)).limit(limit);
}

export async function getVisitsPaginated(opts: {
  patientId?: number; doctorId?: number; status?: string;
  dateFrom?: Date; dateTo?: Date; page?: number; limit?: number; tenantId?: number;
}): Promise<{ data: Visit[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { patientId, doctorId, status, dateFrom, dateTo, page = 1, limit = 20, tenantId } = opts;
  const conditions = [eq(visits.isDeleted, false)];
  if (tenantId) conditions.push(eq(visits.tenantId, tenantId));
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

export async function getFollowUpPatients(tenantId?: number): Promise<Visit[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const conditions = [eq(visits.isDeleted, false), gte(visits.followUpDate, now), lte(visits.followUpDate, nextWeek)];
  if (tenantId !== undefined) conditions.push(eq(visits.tenantId, tenantId) as any);
  return db.select().from(visits)
    .where(and(...conditions))
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
  dateFrom?: Date; dateTo?: Date; page?: number; limit?: number; tenantId?: number;
}): Promise<{ data: Appointment[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { doctorId, patientId, status, dateFrom, dateTo, page = 1, limit = 20, tenantId } = opts;
  const conditions = [eq(appointments.isDeleted, false)];
  if (tenantId) conditions.push(eq(appointments.tenantId, tenantId));
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

export async function getTodayAppointmentCount(doctorId?: number, tenantId?: number): Promise<number> {
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
  if (tenantId) conditions.push(eq(appointments.tenantId, tenantId));
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
  description?: string; metadata?: object; tenantId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values({ ...data, tenantId: data.tenantId ?? 1 });
}

export async function getActivityLogs(opts: {
  userId?: number; entityType?: string; dateFrom?: Date; dateTo?: Date;
  page?: number; limit?: number; tenantId?: number;
}): Promise<{ data: ActivityLog[]; total: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { userId, entityType, dateFrom, dateTo, page = 1, limit = 20, tenantId } = opts;
  const conditions = [];
  if (tenantId) conditions.push(eq(activityLogs.tenantId, tenantId));
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

export async function getRecentActivities(limit = 10, tenantId?: number): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];
  if (tenantId) return db.select().from(activityLogs).where(eq(activityLogs.tenantId, tenantId)).orderBy(desc(activityLogs.createdAt)).limit(limit);
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

// ─── Diagnoses ────────────────────────────────────────────────────────────────
export async function getDiagnoses(tenantId?: number): Promise<typeof diagnoses.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  if (tenantId) return db.select().from(diagnoses).where(eq(diagnoses.tenantId, tenantId)).orderBy(asc(diagnoses.name));
  return db.select().from(diagnoses).orderBy(asc(diagnoses.name));
}

export async function createDiagnosis(data: { name: string; category?: string; color?: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(diagnoses).values(data);
  return (result[0] as any).insertId;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSetting(key: string, tenantId?: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const cond = tenantId ? and(eq(settings.key, key), eq(settings.tenantId, tenantId)) : eq(settings.key, key);
  const result = await db.select().from(settings).where(cond).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(tenantId?: number): Promise<Setting[]> {
  const db = await getDb();
  if (!db) return [];
  if (tenantId) return db.select().from(settings).where(eq(settings.tenantId, tenantId));
  return db.select().from(settings);
}

export async function upsertSetting(key: string, value: string, tenantId = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(settings).values({ key, value, tenantId }).onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ─── Reports / Stats ──────────────────────────────────────────────────────────
export async function getMonthlyPatientStats(tenantId?: number): Promise<Array<{ month: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = tenantId
    ? await db.execute(sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count FROM patients WHERE isDeleted = false AND tenantId = ${tenantId} AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month ASC`)
    : await db.execute(sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count FROM patients WHERE isDeleted = false AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month ASC`);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ month: r.month, count: Number(r.count) }));
}

export async function getMonthlyVisitStats(tenantId?: number): Promise<Array<{ month: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = tenantId
    ? await db.execute(sql`SELECT DATE_FORMAT(visitDate, '%Y-%m') as month, COUNT(*) as count FROM visits WHERE isDeleted = false AND tenantId = ${tenantId} AND visitDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month ASC`)
    : await db.execute(sql`SELECT DATE_FORMAT(visitDate, '%Y-%m') as month, COUNT(*) as count FROM visits WHERE isDeleted = false AND visitDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month ASC`);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ month: r.month, count: Number(r.count) }));
}

export async function getTopDiagnoses(limit = 10, tenantId?: number): Promise<Array<{ diagnosis: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = tenantId
    ? await db.execute(sql`SELECT diagnosisText as diagnosis, COUNT(*) as count FROM visits WHERE isDeleted = false AND tenantId = ${tenantId} AND diagnosisText IS NOT NULL AND diagnosisText != '' GROUP BY diagnosisText ORDER BY count DESC LIMIT ${limit}`)
    : await db.execute(sql`SELECT diagnosisText as diagnosis, COUNT(*) as count FROM visits WHERE isDeleted = false AND diagnosisText IS NOT NULL AND diagnosisText != '' GROUP BY diagnosisText ORDER BY count DESC LIMIT ${limit}`);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ diagnosis: r.diagnosis, count: Number(r.count) }));
}

export async function getDoctorStats(tenantId?: number): Promise<Array<{ doctorId: number; visitCount: number; patientCount: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = tenantId
    ? await db.execute(sql`SELECT doctorId, COUNT(*) as visitCount, COUNT(DISTINCT patientId) as patientCount FROM visits WHERE isDeleted = false AND tenantId = ${tenantId} GROUP BY doctorId ORDER BY visitCount DESC`)
    : await db.execute(sql`SELECT doctorId, COUNT(*) as visitCount, COUNT(DISTINCT patientId) as patientCount FROM visits WHERE isDeleted = false GROUP BY doctorId ORDER BY visitCount DESC`);
  return ((result as unknown as any[][])[0]).map((r: any) => ({
    doctorId: r.doctorId, visitCount: Number(r.visitCount), patientCount: Number(r.patientCount),
  }));
}

export async function getPatientStatusStats(tenantId?: number): Promise<Array<{ status: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = tenantId
    ? await db.execute(sql`SELECT status, COUNT(*) as count FROM patients WHERE isDeleted = false AND tenantId = ${tenantId} GROUP BY status`)
    : await db.execute(sql`SELECT status, COUNT(*) as count FROM patients WHERE isDeleted = false GROUP BY status`);
  return ((result as unknown as any[][])[0]).map((r: any) => ({ status: r.status, count: Number(r.count) }));
}

// ─── Global Search ────────────────────────────────────────────────────────────
export async function globalSearch(query: string, tenantId?: number): Promise<{
  patients: Patient[]; visits: Visit[]; prescriptions: Prescription[];
}> {
  const db = await getDb();
  if (!db) return { patients: [], visits: [], prescriptions: [] };
  const q = `%${query}%`;
  const [pats, vis, pres] = await Promise.all([
    db.select().from(patients).where(and(
      eq(patients.isDeleted, false),
      tenantId ? eq(patients.tenantId, tenantId) : undefined,
      or(like(patients.fullName, q), like(patients.patientId, q), like(patients.phone, q), like(patients.chronicDiseases, q))
    )).limit(10),
    db.select().from(visits).where(and(
      eq(visits.isDeleted, false),
      tenantId ? eq(visits.tenantId, tenantId) : undefined,
      or(like(visits.diagnosisText, q), like(visits.symptoms, q), like(visits.doctorNotes, q))
    )).limit(10),
    db.select().from(prescriptions).where(and(
      eq(prescriptions.isDeleted, false),
      sql`JSON_SEARCH(medications, 'one', ${query}) IS NOT NULL`
    )).limit(10),
  ]);
  return { patients: pats, visits: vis, prescriptions: pres };
}
