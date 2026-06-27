import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, linkedProcedure, router } from "../_core/trpc";
import { getAllSettings, upsertSetting, updateUserProfile, getAllUsers, getDoctors, getDiagnoses, createDiagnosis, getTenantId, getUnassignedUsers, getUsersByTenant, linkUserToTenant } from "../db";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, isNull } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "abdoismeal012@gmail.com";

function isSuperAdmin(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export const settingsRouter = router({
  getAll: linkedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId(ctx.user.email) ?? 1;
    return getAllSettings(tenantId);
  }),

  upsert: linkedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      await upsertSetting(input.key, input.value, tenantId);
      return { success: true };
    }),

  upsertMany: linkedProcedure
    .input(z.array(z.object({ key: z.string(), value: z.string() })))
    .mutation(async ({ input, ctx }) => {
      const tenantId = await getTenantId(ctx.user.email) ?? 1;
      await Promise.all(input.map((s) => upsertSetting(s.key, s.value, tenantId)));
      return { success: true };
    }),
});

export const usersRouter = router({
  // List users - super admin sees all, clinic_admin sees their tenant, staff sees their tenant
  list: protectedProcedure.query(async ({ ctx }) => {
    if (isSuperAdmin(ctx.user.email)) {
      return getAllUsers(); // super admin sees everyone
    }
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return [ctx.user]; // unassigned user sees only themselves
    return getAllUsers(tenantId);
  }),

  // List unassigned users (super admin only - for assigning to tenants)
  listUnassigned: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.user.email)) throw new TRPCError({ code: "FORBIDDEN" });
    return getUnassignedUsers();
  }),

  doctors: protectedProcedure.query(() => getDoctors()),

  updateProfile: linkedProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(["user", "admin", "doctor", "assistant"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only super admin can change roles
      if (input.role && !isSuperAdmin(ctx.user.email) && ctx.user.tenantRole !== "clinic_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "فقط الأدمن يمكنه تغيير الأدوار" });
      }
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),

  // Update role (clinic_admin can update roles within their tenant, super admin can update anyone)
  updateUserRole: protectedProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "doctor", "assistant"]) }))
    .mutation(async ({ input, ctx }) => {
      const isSA = isSuperAdmin(ctx.user.email);
      const isClinicAdmin = ctx.user.tenantRole === "clinic_admin";
      if (!isSA && !isClinicAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بتغيير الأدوار" });

      // Clinic admin can only change roles of users in their own tenant
      if (!isSA && isClinicAdmin) {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const targetUser = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (targetUser[0]?.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تعديل مستخدمين من عيادات أخرى" });
        }
      }

      await updateUserProfile(input.userId, { role: input.role });
      return { success: true };
    }),

  // Assign a user to a tenant (super admin only, or clinic_admin adding staff)
  assignToTenant: protectedProcedure
    .input(z.object({
      userId: z.number(),
      tenantId: z.number(),
      tenantRole: z.enum(["clinic_admin", "staff"]).default("staff"),
    }))
    .mutation(async ({ input, ctx }) => {
      const isSA = isSuperAdmin(ctx.user.email);
      const isClinicAdmin = ctx.user.tenantRole === "clinic_admin";

      if (!isSA && !isClinicAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      // Clinic admin can only add to their own tenant
      if (!isSA && isClinicAdmin && input.tenantId !== ctx.user.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك إضافة مستخدمين لعيادات أخرى" });
      }
      // Clinic admin cannot create another clinic_admin
      if (!isSA && isClinicAdmin && input.tenantRole === "clinic_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك إنشاء أدمن آخر" });
      }

      await linkUserToTenant(input.userId, input.tenantId, input.tenantRole);
      return { success: true };
    }),

  // Remove user from tenant (super admin or clinic_admin)
  removeFromTenant: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const isSA = isSuperAdmin(ctx.user.email);
      const isClinicAdmin = ctx.user.tenantRole === "clinic_admin";
      if (!isSA && !isClinicAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      if (!isSA && isClinicAdmin) {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const targetUser = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (targetUser[0]?.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ tenantId: null, tenantRole: "staff" }).where(eq(users.id, input.userId));
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
      const id = await createDiagnosis(input);
      return { id };
    }),
});
