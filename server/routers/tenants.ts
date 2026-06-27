import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { sendActivationEmail } from "../email";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { tenants, users } from "../../drizzle/schema";
import { eq, desc, and, lte } from "drizzle-orm";
import crypto from "crypto";

// ─── Admin email guard ────────────────────────────────────────────────────────
const ADMIN_EMAIL_PREFIX = "abdoismeal012@gmail.com";

function isSystemAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL_PREFIX.toLowerCase();
}

function assertAdmin(email: string | null | undefined) {
  if (!isSystemAdmin(email)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بالوصول لهذه الصفحة" });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPlanExpiry(plan: "demo" | "monthly" | "quarterly" | "yearly" | "permanent"): Date | null {
  if (plan === "permanent") return null; // no expiry - permanent access
  const now = new Date();
  switch (plan) {
    case "demo":      return new Date(now.getTime() + 48 * 60 * 60 * 1000);       // 48 hours
    case "monthly":   return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);  // 30 days
    case "quarterly": return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);  // 90 days
    case "yearly":    return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
    default:          return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
}

function getPlanLabel(plan: string): string {
  switch (plan) {
    case "demo":      return "تجريبي (48 ساعة)";
    case "monthly":   return "شهري";
    case "quarterly": return "3 شهور";
    case "yearly":    return "سنوي";
    case "permanent": return "دائم";
    default:          return plan;
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const tenantsRouter = router({

  // List all tenants (admin only)
  list: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx.user?.email);
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }),

  // Add a new tenant (admin only)
  create: protectedProcedure
    .input(z.object({
      clinicName: z.string().min(2, "اسم العيادة مطلوب"),
      email: z.string().email("إيميل غير صحيح"),
      phone: z.string().optional(),
      plan: z.enum(["demo", "monthly", "quarterly", "yearly", "permanent"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user?.email);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check duplicate email
      const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "هذا الإيميل مسجل بالفعل" });
      }

      const token = generateToken();
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // token valid 7 days
      const expiresAt = getPlanExpiry(input.plan);

      await db.insert(tenants).values({
        clinicName: input.clinicName,
        email: input.email,
        phone: input.phone ?? null,
        plan: input.plan,
        status: "pending",
        activationToken: token,
        activationTokenExpiresAt: tokenExpiry,
        expiresAt,
        notes: input.notes ?? null,
      });

      return { token, expiresAt, planLabel: getPlanLabel(input.plan) };
    }),

  // Update tenant (extend, suspend, reactivate)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clinicName: z.string().optional(),
      phone: z.string().optional(),
      plan: z.enum(["demo", "monthly", "quarterly", "yearly", "permanent"]).optional(),
      status: z.enum(["pending", "active", "expired", "suspended"]).optional(),
      notes: z.string().optional(),
      extendFromNow: z.boolean().optional(), // if true, recalculate expiresAt from now
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user?.email);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, unknown> = {};
      if (input.clinicName !== undefined) updateData.clinicName = input.clinicName;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.plan !== undefined) {
        updateData.plan = input.plan;
        if (input.extendFromNow) {
          updateData.expiresAt = getPlanExpiry(input.plan);
        }
      }

      await db.update(tenants).set(updateData as any).where(eq(tenants.id, input.id));
      return { success: true };
    }),

  // Delete tenant
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user?.email);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(tenants).where(eq(tenants.id, input.id));
      return { success: true };
    }),

  // Regenerate activation link
  regenerateToken: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user?.email);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const token = generateToken();
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.update(tenants).set({
        activationToken: token,
        activationTokenExpiresAt: tokenExpiry,
        status: "pending",
      }).where(eq(tenants.id, input.id));

      return { token };
    }),

  // Validate activation token (public - for client activation page)
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.select().from(tenants)
        .where(eq(tenants.activationToken, input.token))
        .limit(1);

      const tenant = result[0];
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "رابط التفعيل غير صحيح" });
      if (tenant.activationTokenExpiresAt && tenant.activationTokenExpiresAt < new Date() && tenant.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رابط التفعيل انتهت صلاحيته" });
      }

      return {
        id: tenant.id,
        clinicName: tenant.clinicName,
        email: tenant.email,
        plan: tenant.plan,
        planLabel: getPlanLabel(tenant.plan),
        expiresAt: tenant.expiresAt,
        alreadyActive: tenant.status === "active",
      };
    }),

  // Activate tenant account (public - client sets password via Manus OAuth)
  activate: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.select().from(tenants)
        .where(eq(tenants.activationToken, input.token))
        .limit(1);

      const tenant = result[0];
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "رابط التفعيل غير صحيح" });
      // If already active, just return success (idempotent)
      if (tenant.status === "active") {
        return { success: true, clinicName: tenant.clinicName, expiresAt: tenant.expiresAt };
      }
      if (tenant.activationTokenExpiresAt && tenant.activationTokenExpiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رابط التفعيل انتهت صلاحيته" });
      }

      // Keep the token so the link remains valid for future logins
      await db.update(tenants).set({
        status: "active",
        activatedAt: new Date(),
        // Do NOT delete activationToken - keep it so the link works permanently
      }).where(eq(tenants.id, tenant.id));

      return { success: true, clinicName: tenant.clinicName, expiresAt: tenant.expiresAt };
    }),

  // Link the currently logged-in user to a tenant using an activation token
  // This is called when an already-logged-in user opens an activation link
  linkCurrentUser: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.select().from(tenants)
        .where(eq(tenants.activationToken, input.token))
        .limit(1);

      const tenant = result[0];
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "رابط التفعيل غير صحيح" });
      if (tenant.activationTokenExpiresAt && tenant.activationTokenExpiresAt < new Date() && tenant.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رابط التفعيل انتهت صلاحيته" });
      }

      // Update the user's tenantId and tenantRole in the users table
      await db.update(users)
        .set({ tenantId: tenant.id, tenantRole: "clinic_admin" })
        .where(eq(users.id, ctx.user.id));

      // Also mark the tenant as active if it isn't already
      if (tenant.status !== "active") {
        await db.update(tenants).set({
          status: "active",
          activatedAt: new Date(),
        }).where(eq(tenants.id, tenant.id));
      }

      return { success: true, clinicName: tenant.clinicName, expiresAt: tenant.expiresAt };
    }),

  // Send invitation email to a client with their activation link
  sendInvitationEmail: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user?.email);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.select().from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      const tenant = result[0];
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      if (!tenant.email) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد إيميل مسجل لهذا العميل" });
      if (!tenant.activationToken) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد رابط تفعيل — أعد توليد الرابط أولاً" });

      const baseUrl = process.env.VITE_APP_URL ?? "https://clinic-system.org";
      const activationLink = `${baseUrl}/activate?token=${tenant.activationToken}`;

      const emailResult = await sendActivationEmail({
        toEmail: tenant.email,
        toName: undefined,
        clinicName: tenant.clinicName,
        activationLink,
      });

      if (emailResult.error) {
        console.error("[Email] Failed to send:", emailResult.error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل إرسال الإيميل: ${emailResult.error.message}` });
      }

      return { success: true, emailId: emailResult.data?.id };
    }),

  // Check if current user's email has an active subscription
  checkMySubscription: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.email) return null;
    // System admin always has access
    if (isSystemAdmin(ctx.user.email)) return { status: "active", isAdmin: true };

    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(tenants)
      .where(eq(tenants.email, ctx.user.email))
      .limit(1);

    const tenant = result[0];
    if (!tenant) return null;

    // Auto-expire check (skip for permanent plan)
    if (tenant.plan !== "permanent" && tenant.status === "active" && tenant.expiresAt && tenant.expiresAt < new Date()) {
      await db.update(tenants).set({ status: "expired" }).where(eq(tenants.id, tenant.id));
      return { status: "expired", isAdmin: false, clinicName: tenant.clinicName, expiresAt: tenant.expiresAt };
    }

    return {
      status: tenant.status,
      isAdmin: false,
      clinicName: tenant.clinicName,
      plan: tenant.plan,
      expiresAt: tenant.expiresAt,
    };
  }),
});
