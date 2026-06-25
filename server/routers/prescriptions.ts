import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createPrescription, createTemplate, deletePrescription, deleteTemplate,
  getPrescriptionById, getPrescriptionsByPatient, getTemplatesByDoctor,
  logActivity, updateTemplate,
} from "../db";

const medicationItem = z.object({
  medicine: z.string().min(1),
  dose: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional().default(""),
});

export const prescriptionsRouter = router({
  byPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => getPrescriptionsByPatient(input.patientId)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const p = await getPrescriptionById(input.id);
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });
      return p;
    }),

  create: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      visitId: z.number().optional(),
      medications: z.array(medicationItem).min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only doctors can create prescriptions" });
      }
      const id = await createPrescription({
        ...input,
        doctorId: ctx.user.id,
        createdBy: ctx.user.id,
      });
      await logActivity({
        userId: ctx.user.id,
        action: "prescription_created",
        entityType: "prescription",
        entityId: id,
        description: `Prescription created for patient #${input.patientId}`,
      });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deletePrescription(input.id);
      return { success: true };
    }),

  // Templates
  templates: protectedProcedure.query(async ({ ctx }) => {
    return getTemplatesByDoctor(ctx.user.id);
  }),

  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      medications: z.array(medicationItem).min(1),
      isFavorite: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await createTemplate({
        ...input,
        isFavorite: input.isFavorite ?? false,
        doctorId: ctx.user.id,
      });
      return { id };
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      medications: z.array(medicationItem).optional(),
      isFavorite: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateTemplate(id, data);
      return { success: true };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTemplate(input.id);
      return { success: true };
    }),
});
