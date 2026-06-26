import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAllSettings, upsertSetting, updateUserProfile, getAllUsers, getDoctors, getDiagnoses, createDiagnosis, getTenantId } from "../db";

export const settingsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return getAllSettings(tenantId);
  }),

  upsert: protectedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      await upsertSetting(input.key, input.value, tenantId);
      return { success: true };
    }),

  upsertMany: protectedProcedure
    .input(z.array(z.object({ key: z.string(), value: z.string() })))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      await Promise.all(input.map((s) => upsertSetting(s.key, s.value, tenantId)));
      return { success: true };
    }),
});

export const usersRouter = router({
  list: protectedProcedure.query(() => getAllUsers()),
  doctors: protectedProcedure.query(() => getDoctors()),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(["user", "admin", "doctor", "assistant"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only admin can change roles
      if (input.role && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change roles" });
      }
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),

  updateUserRole: protectedProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "doctor", "assistant"]) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateUserProfile(input.userId, { role: input.role });
      return { success: true };
    }),
});

export const diagnosesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return getDiagnoses(tenantId);
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), category: z.string().optional(), color: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "doctor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await createDiagnosis(input);
      return { id };
    }),
});
