import { z } from "zod";
import { linkedProcedure as protectedProcedure, router } from "../_core/trpc";
import {
  getDoctorStats, getMonthlyPatientStats, getMonthlyVisitStats,
  getPatientStatusStats, getTopDiagnoses, getAllUsers, getTenantId,
} from "../db";
import { invokeLLM } from "../_core/llm";

export const reportsRouter = router({
  monthlyPatients: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = (await getTenantId(ctx.user.email)) ?? undefined;
    return getMonthlyPatientStats(tenantId);
  }),
  monthlyVisits: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = (await getTenantId(ctx.user.email)) ?? undefined;
    return getMonthlyVisitStats(tenantId);
  }),
  topDiagnoses: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const tenantId = (await getTenantId(ctx.user.email)) ?? undefined;
      return getTopDiagnoses(input.limit, tenantId);
    }),
  patientStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = (await getTenantId(ctx.user.email)) ?? undefined;
    return getPatientStatusStats(tenantId);
  }),
  doctorStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = (await getTenantId(ctx.user.email)) ?? undefined;
    const [stats, doctors] = await Promise.all([getDoctorStats(tenantId), getAllUsers()]);
    return stats.map((s) => {
      const doctor = doctors.find((d) => d.id === s.doctorId);
      return { ...s, doctorName: doctor?.name ?? `Doctor #${s.doctorId}` };
    });
  }),

  aiAnalysis: protectedProcedure.mutation(async () => {
    const [
      monthlyPatients,
      monthlyVisits,
      topDiagnoses,
      patientStatus,
      doctorStats,
    ] = await Promise.all([
      getMonthlyPatientStats(),
      getMonthlyVisitStats(),
      getTopDiagnoses(10),
      getPatientStatusStats(),
      getDoctorStats(),
    ]);

    const totalPatients = (patientStatus as any[]).reduce((sum, s) => sum + Number(s.count), 0);
    const totalVisits = (monthlyVisits as any[]).reduce((sum, v) => sum + Number(v.count), 0);
    const criticalCount = (patientStatus as any[]).find((s) => s.status === "critical")?.count ?? 0;
    const followUpCount = (patientStatus as any[]).find((s) => s.status === "follow-up")?.count ?? 0;

    const prompt = `You are a senior medical analyst for a clinic management system. Analyze the following clinic statistics and provide a comprehensive medical intelligence report.

CLINIC DATA SUMMARY:
- Total registered patients: ${totalPatients}
- Total visits recorded: ${totalVisits}
- Critical patients: ${criticalCount}
- Follow-up patients: ${followUpCount}

PATIENT STATUS DISTRIBUTION:
${(patientStatus as any[]).map((s) => `  - ${s.status}: ${s.count} patients`).join("\n")}

TOP 10 DIAGNOSES:
${(topDiagnoses as any[]).map((d, i) => `  ${i + 1}. ${d.name} (${d.count} cases)`).join("\n")}

MONTHLY PATIENT REGISTRATIONS (last 12 months):
${(monthlyPatients as any[]).map((m) => `  - ${m.month}: ${m.count} new patients`).join("\n")}

MONTHLY VISIT COUNTS (last 12 months):
${(monthlyVisits as any[]).map((m) => `  - ${m.month}: ${m.count} visits`).join("\n")}

DOCTOR ACTIVITY:
${(doctorStats as any[]).map((d) => `  - Doctor ID ${d.doctorId}: ${d.visitCount} visits, ${d.patientCount} patients`).join("\n")}

Please provide a structured medical intelligence report with the following sections:

1. **Executive Summary** (2-3 sentences overview of clinic health)
2. **Key Findings** (3-5 most important observations from the data)
3. **Disease Pattern Analysis** (analysis of the top diagnoses, any concerning trends)
4. **Patient Risk Assessment** (analysis of critical/follow-up patients, recommendations)
5. **Operational Insights** (visit trends, workload distribution, efficiency observations)
6. **Recommendations** (3-5 actionable recommendations for clinic improvement)
7. **Alert Flags** (any urgent concerns that need immediate attention)

Format your response as a professional medical report. Use clear headings and bullet points. Be specific and data-driven.`;

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert medical data analyst specializing in clinic performance analytics and epidemiology. Provide actionable, evidence-based insights from clinic data.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 2000,
    });

    const content = result.choices?.[0]?.message?.content;
    const text = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? (content as any[]).map((c) => c.text ?? "").join("")
        : "";

    return {
      report: text,
      generatedAt: new Date().toISOString(),
      dataSnapshot: {
        totalPatients,
        totalVisits,
        criticalCount: Number(criticalCount),
        followUpCount: Number(followUpCount),
        topDiagnosis: (topDiagnoses as any[])[0]?.name ?? "N/A",
        topDiagnosisCount: Number((topDiagnoses as any[])[0]?.count ?? 0),
      },
    };
  }),
});
