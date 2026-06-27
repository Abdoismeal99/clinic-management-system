import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { linkedProcedure as protectedProcedure, router } from "../_core/trpc";
import {
  createPatient, generatePatientId, getPatientById, getPatients,
  restorePatient, softDeletePatient, updatePatient, logActivity,
  getVisitsByPatient, getPrescriptionsByPatient, getFilesByPatient, getAppointments,
  getTenantId,
} from "../db";

const patientInput = z.object({
  fullName: z.string().min(2),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).optional(),
  allergies: z.string().optional(),
  chronicDiseases: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  medicalNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["new", "follow-up", "stable", "critical"]).optional(),
});

export const patientsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      gender: z.string().optional(),
      tag: z.string().optional(),
      isDeleted: z.boolean().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      return getPatients({ ...input, tenantId });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const patient = await getPatientById(input.id, tenantId);
      if (!patient) throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      return patient;
    }),

  create: protectedProcedure
    .input(patientInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const patientId = await generatePatientId();
      const id = await createPatient({
        ...input,
        patientId,
        tenantId,
        gender: input.gender,
        status: input.status ?? "new",
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        tags: input.tags && input.tags.length > 0 ? JSON.stringify(input.tags) : null,
        createdBy: ctx.user.id,
      });
      await logActivity({
        userId: ctx.user.id,
        tenantId,
        action: "patient_created",
        entityType: "patient",
        entityId: id,
        description: `Patient ${input.fullName} (${patientId}) created`,
      });
      return { id, patientId };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(patientInput.partial()))
    .mutation(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const { id, ...data } = input;
      await updatePatient(id, {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        tags: data.tags !== undefined ? JSON.stringify(data.tags) : undefined,
      }, ctx.user.id);
      await logActivity({
        userId: ctx.user.id,
        tenantId,
        action: "patient_updated",
        entityType: "patient",
        entityId: id,
        description: `Patient record updated`,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      await softDeletePatient(input.id, ctx.user.id);
      await logActivity({
        userId: ctx.user.id,
        tenantId,
        action: "patient_deleted",
        entityType: "patient",
        entityId: input.id,
        description: `Patient moved to archive`,
      });
      return { success: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      await restorePatient(input.id);
      await logActivity({
        userId: ctx.user.id,
        tenantId,
        action: "patient_restored",
        entityType: "patient",
        entityId: input.id,
        description: `Patient restored from archive`,
      });
      return { success: true };
    }),

  exportData: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const patient = await getPatientById(input.id, tenantId);
      if (!patient) throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      const [visits, prescriptions, files, appointmentsResult] = await Promise.all([
        getVisitsByPatient(input.id),
        getPrescriptionsByPatient(input.id),
        getFilesByPatient(input.id),
        getAppointments({ patientId: input.id, limit: 100, tenantId }),
      ]);
      return {
        patient,
        visits,
        prescriptions,
        files,
        appointments: appointmentsResult.data,
      };
    }),
});
