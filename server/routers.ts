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
import {
  getPatientCount, getTodayAppointmentCount, getRecentPatients,
  getRecentVisits, getFollowUpPatients, getMonthlyPatientStats,
  getMonthlyVisitStats, getRecentActivities, getAllUsers,
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
      const [patientCount, todayAppts, recentPatients, recentVisits, followUps, monthlyPatients, monthlyVisits, activities] =
        await Promise.all([
          getPatientCount(),
          getTodayAppointmentCount(ctx.user?.role === "doctor" ? ctx.user.id : undefined),
          getRecentPatients(5),
          getRecentVisits(5),
          getFollowUpPatients(),
          getMonthlyPatientStats(),
          getMonthlyVisitStats(),
          getRecentActivities(8),
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
});

export type AppRouter = typeof appRouter;
