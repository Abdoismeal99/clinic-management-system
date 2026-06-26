import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAppointment, deleteAppointment, getAppointmentById, getAppointments,
  getTodayAppointmentCount, logActivity, updateAppointment, getTenantId,
} from "../db";

export const appointmentsRouter = router({
  list: protectedProcedure
    .input(z.object({
      doctorId: z.number().optional(),
      patientId: z.number().optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      return getAppointments({
        ...input,
        tenantId,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const appt = await getAppointmentById(input.id);
      if (!appt) throw new TRPCError({ code: "NOT_FOUND" });
      return appt;
    }),

  todayCount: protectedProcedure
    .input(z.object({ doctorId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      return getTodayAppointmentCount(input.doctorId, tenantId);
    }),

  create: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      doctorId: z.number(),
      appointmentDate: z.string(),
      duration: z.number().optional(),
      reason: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "completed", "cancelled", "no-show"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = ctx.user.role;
      if (role !== "admin" && role !== "doctor" && role !== "assistant") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const id = await createAppointment({
        ...input,
        tenantId,
        appointmentDate: new Date(input.appointmentDate),
        status: input.status ?? "pending",
        createdBy: ctx.user.id,
      });
      await logActivity({
        userId: ctx.user.id,
        tenantId,
        action: "appointment_created",
        entityType: "appointment",
        entityId: id,
        description: `Appointment scheduled for patient #${input.patientId}`,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      appointmentDate: z.string().optional(),
      duration: z.number().optional(),
      reason: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "completed", "cancelled", "no-show"]).optional(),
      doctorId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = ctx.user.role;
      if (role !== "admin" && role !== "doctor" && role !== "assistant") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      const { id, ...data } = input;
      await updateAppointment(id, {
        ...data,
        appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : undefined,
      }, ctx.user.id);
      await logActivity({
        userId: ctx.user.id,
        tenantId,
        action: "appointment_updated",
        entityType: "appointment",
        entityId: id,
        description: `Appointment #${id} updated`,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteAppointment(input.id);
      return { success: true };
    }),
});
