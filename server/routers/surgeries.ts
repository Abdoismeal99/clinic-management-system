import { z } from "zod";
import { linkedProcedure as protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getTenantId } from "../db";
import { surgeries, surgeryTypes, clinicDoctors, patients } from "../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// ─── Surgery Types Router ─────────────────────────────────────────────────────
export const surgeryTypesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return db
      .select()
      .from(surgeryTypes)
      .where(and(eq(surgeryTypes.isActive, true), eq(surgeryTypes.tenantId, tenantId)))
      .orderBy(surgeryTypes.name);
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return db.select().from(surgeryTypes).where(eq(surgeryTypes.tenantId, tenantId)).orderBy(surgeryTypes.name);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const [result] = await db.insert(surgeryTypes).values({
        name: input.name,
        description: input.description,
        tenantId,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(surgeryTypes).set(data).where(eq(surgeryTypes.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(surgeryTypes).set({ isActive: false }).where(eq(surgeryTypes.id, input.id));
      return { success: true };
    }),
});

// ─── Clinic Doctors Router ────────────────────────────────────────────────────
export const clinicDoctorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return db
      .select()
      .from(clinicDoctors)
      .where(and(eq(clinicDoctors.isActive, true), eq(clinicDoctors.tenantId, tenantId)))
      .orderBy(clinicDoctors.name);
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return db.select().from(clinicDoctors).where(eq(clinicDoctors.tenantId, tenantId)).orderBy(clinicDoctors.name);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      specialty: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const [result] = await db.insert(clinicDoctors).values({
        name: input.name,
        specialty: input.specialty,
        phone: input.phone,
        tenantId,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(clinicDoctors).set(data).where(eq(clinicDoctors.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(clinicDoctors).set({ isActive: false }).where(eq(clinicDoctors.id, input.id));
      return { success: true };
    }),
});

// ─── Surgeries Router ─────────────────────────────────────────────────────────
export const surgeriesRouter = router({
  list: protectedProcedure
    .input(z.object({
      patientId: z.number().optional(),
      doctorId: z.number().optional(),
      status: z.string().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const rows = await db
        .select({
          id: surgeries.id,
          patientId: surgeries.patientId,
          patientName: patients.fullName,
          patientCode: patients.patientId,
          doctorId: surgeries.doctorId,
          doctorName: clinicDoctors.name,
          surgeryTypeId: surgeries.surgeryTypeId,
          surgeryTypeName: surgeryTypes.name,
          surgeryDate: surgeries.surgeryDate,
          notes: surgeries.notes,
          status: surgeries.status,
          createdAt: surgeries.createdAt,
        })
        .from(surgeries)
        .leftJoin(patients, eq(surgeries.patientId, patients.id))
        .leftJoin(clinicDoctors, eq(surgeries.doctorId, clinicDoctors.id))
        .leftJoin(surgeryTypes, eq(surgeries.surgeryTypeId, surgeryTypes.id))
        .where(and(eq(surgeries.isDeleted, false), eq(surgeries.tenantId, tenantId)))
        .orderBy(desc(surgeries.surgeryDate));

      type SurgeryRow = (typeof rows)[number];
      let result: SurgeryRow[] = rows;
      if (input?.patientId) { const pid = input.patientId; result = result.filter((r: SurgeryRow) => r.patientId === pid); }
      if (input?.doctorId) { const did = input.doctorId; result = result.filter((r: SurgeryRow) => r.doctorId === did); }
      if (input?.status) { const st = input.status; result = result.filter((r: SurgeryRow) => r.status === st); }
      if (input?.from) { const fr = input.from; result = result.filter((r: SurgeryRow) => r.surgeryDate != null && r.surgeryDate >= fr); }
      if (input?.to) { const to = input.to; result = result.filter((r: SurgeryRow) => r.surgeryDate != null && r.surgeryDate <= to); }
      return result;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db
        .select({
          id: surgeries.id,
          patientId: surgeries.patientId,
          patientName: patients.fullName,
          patientCode: patients.patientId,
          doctorId: surgeries.doctorId,
          doctorName: clinicDoctors.name,
          surgeryTypeId: surgeries.surgeryTypeId,
          surgeryTypeName: surgeryTypes.name,
          surgeryDate: surgeries.surgeryDate,
          notes: surgeries.notes,
          status: surgeries.status,
          createdAt: surgeries.createdAt,
          updatedAt: surgeries.updatedAt,
        })
        .from(surgeries)
        .leftJoin(patients, eq(surgeries.patientId, patients.id))
        .leftJoin(clinicDoctors, eq(surgeries.doctorId, clinicDoctors.id))
        .leftJoin(surgeryTypes, eq(surgeries.surgeryTypeId, surgeryTypes.id))
        .where(and(eq(surgeries.id, input.id), eq(surgeries.isDeleted, false)));

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "العملية غير موجودة" });
      return row;
    }),

  create: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      doctorId: z.number(),
      surgeryTypeId: z.number(),
      surgeryDate: z.date(),
      notes: z.string().optional(),
      status: z.enum(["scheduled", "completed", "cancelled", "postponed"]).default("scheduled"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const [result] = await db.insert(surgeries).values({
        patientId: input.patientId,
        doctorId: input.doctorId,
        surgeryTypeId: input.surgeryTypeId,
        surgeryDate: input.surgeryDate,
        notes: input.notes,
        status: input.status,
        tenantId,
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      patientId: z.number().optional(),
      doctorId: z.number().optional(),
      surgeryTypeId: z.number().optional(),
      surgeryDate: z.date().optional(),
      notes: z.string().optional(),
      status: z.enum(["scheduled", "completed", "cancelled", "postponed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(surgeries).set({ ...data, updatedBy: ctx.user.id }).where(eq(surgeries.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(surgeries).set({ isDeleted: true, updatedBy: ctx.user.id }).where(eq(surgeries.id, input.id));
      return { success: true };
    }),

  upcoming: protectedProcedure
    .input(z.object({ days: z.number().default(30) }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + (input?.days ?? 30));

      return db
        .select({
          id: surgeries.id,
          patientId: surgeries.patientId,
          patientName: patients.fullName,
          doctorId: surgeries.doctorId,
          doctorName: clinicDoctors.name,
          surgeryTypeId: surgeries.surgeryTypeId,
          surgeryTypeName: surgeryTypes.name,
          surgeryDate: surgeries.surgeryDate,
          notes: surgeries.notes,
          status: surgeries.status,
        })
        .from(surgeries)
        .leftJoin(patients, eq(surgeries.patientId, patients.id))
        .leftJoin(clinicDoctors, eq(surgeries.doctorId, clinicDoctors.id))
        .leftJoin(surgeryTypes, eq(surgeries.surgeryTypeId, surgeryTypes.id))
        .where(
          and(
            eq(surgeries.isDeleted, false),
            eq(surgeries.tenantId, tenantId),
            gte(surgeries.surgeryDate, now),
            lte(surgeries.surgeryDate, future),
          )
        )
        .orderBy(surgeries.surgeryDate);
    }),
});
