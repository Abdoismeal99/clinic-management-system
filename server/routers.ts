import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { patientsRouter } from "./routers/patients";
import { visitsRouter } from "./routers/visits";
import { prescriptionsRouter } from "./routers/prescriptions";
import { appointmentsRouter } from "./routers/appointments";
import { filesRouter } from "./routers/files";
import { searchRouter } from "./routers/search";
import { reportsRouter } from "./routers/reports";
import { activityRouter } from "./routers/activity";
import { settingsRouter, usersRouter, diagnosesRouter } from "./routers/settings";
import { seedRouter } from "./routers/seed";
import { surgeriesRouter, surgeryTypesRouter, clinicDoctorsRouter } from "./routers/surgeries";
import { aiAssistantRouter } from "./routers/aiAssistant";
import { tenantsRouter } from "./routers/tenants";
import {
  getPatientCount, getTodayAppointmentCount, getRecentPatients,
  getRecentVisits, getFollowUpPatients, getMonthlyPatientStats,
  getMonthlyVisitStats, getRecentActivities, getAllUsers, getTenantId,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    stats: publicProcedure.query(async ({ ctx }) => {
      const tenantId = ctx.user?.email ? await getTenantId(ctx.user.email) : undefined;
      const [patientCount, todayAppts, recentPatients, recentVisits, followUps, monthlyPatients, monthlyVisits, activities] =
        await Promise.all([
          getPatientCount(tenantId ?? undefined),
          getTodayAppointmentCount(ctx.user?.role === "doctor" ? ctx.user.id : undefined, tenantId ?? undefined),
          getRecentPatients(5, tenantId ?? undefined),
          getRecentVisits(5, tenantId ?? undefined),
          getFollowUpPatients(tenantId ?? undefined),
          getMonthlyPatientStats(tenantId ?? undefined),
          getMonthlyVisitStats(tenantId ?? undefined),
          getRecentActivities(8, tenantId ?? undefined),
        ]);
      return { patientCount, todayAppts, recentPatients, recentVisits, followUps, monthlyPatients, monthlyVisits, activities };
    }),
  }),

  patients: patientsRouter,
  visits: visitsRouter,
  prescriptions: prescriptionsRouter,
  appointments: appointmentsRouter,
  files: filesRouter,
  search: searchRouter,
  reports: reportsRouter,
  activity: activityRouter,
  settings: settingsRouter,
  users: usersRouter,
  diagnoses: diagnosesRouter,
  seed: seedRouter,
  surgeries: surgeriesRouter,
  surgeryTypes: surgeryTypesRouter,
  clinicDoctors: clinicDoctorsRouter,
  aiAssistant: aiAssistantRouter,
  tenants: tenantsRouter,
});

export type AppRouter = typeof appRouter;
