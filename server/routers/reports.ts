import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getDoctorStats, getMonthlyPatientStats, getMonthlyVisitStats,
  getPatientStatusStats, getTopDiagnoses, getAllUsers,
} from "../db";

export const reportsRouter = router({
  monthlyPatients: protectedProcedure.query(() => getMonthlyPatientStats()),
  monthlyVisits: protectedProcedure.query(() => getMonthlyVisitStats()),
  topDiagnoses: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getTopDiagnoses(input.limit)),
  patientStatus: protectedProcedure.query(() => getPatientStatusStats()),
  doctorStats: protectedProcedure.query(async () => {
    const [stats, doctors] = await Promise.all([getDoctorStats(), getAllUsers()]);
    return stats.map((s) => {
      const doctor = doctors.find((d) => d.id === s.doctorId);
      return { ...s, doctorName: doctor?.name ?? `Doctor #${s.doctorId}` };
    });
  }),
});
