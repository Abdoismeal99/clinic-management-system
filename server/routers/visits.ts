import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createVisit, deleteVisit, getFollowUpPatients, getRecentVisits,
  getVisitById, getVisitsByPatient, getVisitsPaginated, logActivity, updateVisit,
} from "../db";

const vitalSignsInput = z.object({
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  heartRate: z.number().optional(),
  temperature: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  oxygenSaturation: z.number().optional(),
  respiratoryRate: z.number().optional(),
});

const visitInput = z.object({
  patientId: z.number(),
  visitDate: z.string(),
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  diagnosisText: z.string().optional(),
  diagnosisTags: z.array(z.string()).optional(),
  doctorNotes: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  status: z.enum(["scheduled", "in-progress", "completed", "cancelled"]).optional(),
}).merge(vitalSignsInput);

export const visitsRouter = router({
  list: protectedProcedure
    .input(z.object({
      patientId: z.number().optional(),
      doctorId: z.number().optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getVisitsPaginated({
        ...input,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      });
    }),

  byPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => getVisitsByPatient(input.patientId)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const visit = await getVisitById(input.id);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND" });
      return visit;
    }),

  recent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => getRecentVisits(input.limit)),

  followUps: protectedProcedure.query(async () => getFollowUpPatients()),

  create: protectedProcedure
    .input(visitInput)
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only doctors can create visits" });
      }
      const id = await createVisit({
        ...input,
        visitDate: new Date(input.visitDate),
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        temperature: input.temperature ? input.temperature : null,
        weight: input.weight ? input.weight : null,
        height: input.height ? input.height : null,
        diagnosisTags: input.diagnosisTags ?? [],
        doctorId: ctx.user.id,
        createdBy: ctx.user.id,
        status: input.status ?? "completed",
      });
      await logActivity({
        userId: ctx.user.id,
        action: "visit_created",
        entityType: "visit",
        entityId: id,
        description: `Visit created for patient #${input.patientId}`,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(visitInput.partial()))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      await updateVisit(id, {
        ...data,
        visitDate: data.visitDate ? new Date(data.visitDate) : undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      }, ctx.user.id);
      await logActivity({
        userId: ctx.user.id,
        action: "visit_updated",
        entityType: "visit",
        entityId: id,
        description: `Visit #${id} updated`,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete visits" });
      }
      await deleteVisit(input.id);
      return { success: true };
    }),
});
