import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb, getTenantId } from "../db";
import {
  patients,
  visits,
  appointments,
  prescriptions,
  surgeries,
  clinicDoctors,
  surgeryTypes,
  settings,
} from "../../drizzle/schema";
import { and, count, desc, eq, gte, lte, asc } from "drizzle-orm";

// ─── Fetch all clinic data for a tenant ───────────────────────────────────────

async function getAllClinicData(tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    allPatients,
    allDoctors,
    allSurgeryTypes,
    todayAppts,
    upcomingAppts,
    upcomingSurgs,
    totalPatients,
    newPatientsLast3Days,
    newPatientsLast7Days,
    newPatientsLast30Days,
    visitsLast3Days,
    visitsLast7Days,
    visitsLast30Days,
    clinicSettingsRows,
  ] = await Promise.all([
    // All patients
    db
      .select({
        id: patients.id,
        fullName: patients.fullName,
        patientId: patients.patientId,
        phone: patients.phone,
        gender: patients.gender,
        dateOfBirth: patients.dateOfBirth,
        status: patients.status,
        bloodType: patients.bloodType,
        allergies: patients.allergies,
        chronicDiseases: patients.chronicDiseases,
        medicalNotes: patients.medicalNotes,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false)))
      .orderBy(desc(patients.createdAt))
      .limit(500),

    // All clinic doctors
    db
      .select({
        id: clinicDoctors.id,
        name: clinicDoctors.name,
        specialty: clinicDoctors.specialty,
        phone: clinicDoctors.phone,
        isActive: clinicDoctors.isActive,
      })
      .from(clinicDoctors)
      .where(eq(clinicDoctors.tenantId, tenantId))
      .orderBy(asc(clinicDoctors.name)),

    // All surgery types
    db
      .select({ id: surgeryTypes.id, name: surgeryTypes.name, description: surgeryTypes.description })
      .from(surgeryTypes)
      .where(eq(surgeryTypes.tenantId, tenantId)),

    // Today's appointments with patient + doctor names via join
    db
      .select({
        id: appointments.id,
        patientName: patients.fullName,
        doctorName: clinicDoctors.name,
        appointmentDate: appointments.appointmentDate,
        reason: appointments.reason,
        status: appointments.status,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(clinicDoctors, eq(appointments.doctorId, clinicDoctors.id))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.isDeleted, false),
          gte(appointments.appointmentDate, todayStart),
          lte(appointments.appointmentDate, todayEnd)
        )
      )
      .orderBy(asc(appointments.appointmentDate))
      .limit(20),

    // Upcoming appointments (next 7 days)
    db
      .select({
        id: appointments.id,
        patientName: patients.fullName,
        doctorName: clinicDoctors.name,
        appointmentDate: appointments.appointmentDate,
        reason: appointments.reason,
        status: appointments.status,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(clinicDoctors, eq(appointments.doctorId, clinicDoctors.id))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.isDeleted, false),
          gte(appointments.appointmentDate, now),
          lte(appointments.appointmentDate, nextWeek)
        )
      )
      .orderBy(asc(appointments.appointmentDate))
      .limit(20),

    // Upcoming surgeries with patient + doctor + surgery type names
    db
      .select({
        id: surgeries.id,
        patientName: patients.fullName,
        doctorName: clinicDoctors.name,
        surgeryTypeName: surgeryTypes.name,
        surgeryDate: surgeries.surgeryDate,
        status: surgeries.status,
        notes: surgeries.notes,
      })
      .from(surgeries)
      .leftJoin(patients, eq(surgeries.patientId, patients.id))
      .leftJoin(clinicDoctors, eq(surgeries.doctorId, clinicDoctors.id))
      .leftJoin(surgeryTypes, eq(surgeries.surgeryTypeId, surgeryTypes.id))
      .where(and(eq(surgeries.tenantId, tenantId), gte(surgeries.surgeryDate, now)))
      .orderBy(asc(surgeries.surgeryDate))
      .limit(10),

    // Stats
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), gte(patients.createdAt, threeDaysAgo))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), gte(patients.createdAt, sevenDaysAgo))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), gte(patients.createdAt, thirtyDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.tenantId, tenantId), eq(visits.isDeleted, false), gte(visits.visitDate, threeDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.tenantId, tenantId), eq(visits.isDeleted, false), gte(visits.visitDate, sevenDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.tenantId, tenantId), eq(visits.isDeleted, false), gte(visits.visitDate, thirtyDaysAgo))),

    // Clinic settings
    db.select().from(settings).where(eq(settings.tenantId, tenantId)).limit(1),
  ]);

  return {
    allPatients,
    allDoctors,
    allSurgeryTypes,
    todayAppts,
    upcomingAppts,
    upcomingSurgs,
    stats: {
      totalPatients: totalPatients[0]?.cnt ?? 0,
      newPatientsLast3Days: newPatientsLast3Days[0]?.cnt ?? 0,
      newPatientsLast7Days: newPatientsLast7Days[0]?.cnt ?? 0,
      newPatientsLast30Days: newPatientsLast30Days[0]?.cnt ?? 0,
      visitsLast3Days: visitsLast3Days[0]?.cnt ?? 0,
      visitsLast7Days: visitsLast7Days[0]?.cnt ?? 0,
      visitsLast30Days: visitsLast30Days[0]?.cnt ?? 0,
      todayAppointments: todayAppts.length,
      upcomingAppointments: upcomingAppts.length,
      upcomingSurgeries: upcomingSurgs.length,
    },
    clinicName: (clinicSettingsRows[0] as any)?.clinicName ?? "العيادة",
    currentDate: now.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  };
}

// Fetch full patient details + visits + prescriptions + surgeries by patient DB id
async function getFullPatientData(patientDbId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const [patientVisits, patientPrescriptions, patientSurgeries] = await Promise.all([
    db
      .select({
        visitDate: visits.visitDate,
        diagnosisText: visits.diagnosisText,
        chiefComplaint: visits.chiefComplaint,
        symptoms: visits.symptoms,
        doctorNotes: visits.doctorNotes,
        status: visits.status,
        followUpDate: visits.followUpDate,
      })
      .from(visits)
      .where(and(eq(visits.tenantId, tenantId), eq(visits.patientId, patientDbId), eq(visits.isDeleted, false)))
      .orderBy(desc(visits.visitDate))
      .limit(10),

    db
      .select({
        prescriptionDate: prescriptions.prescriptionDate,
        medications: prescriptions.medications,
        treatmentName: prescriptions.treatmentName,
        notes: prescriptions.notes,
      })
      .from(prescriptions)
      .where(and(eq(prescriptions.tenantId, tenantId), eq(prescriptions.patientId, patientDbId), eq(prescriptions.isDeleted, false)))
      .orderBy(desc(prescriptions.prescriptionDate))
      .limit(5),

    db
      .select({
        surgeryDate: surgeries.surgeryDate,
        surgeryTypeName: surgeryTypes.name,
        doctorName: clinicDoctors.name,
        status: surgeries.status,
        notes: surgeries.notes,
      })
      .from(surgeries)
      .leftJoin(surgeryTypes, eq(surgeries.surgeryTypeId, surgeryTypes.id))
      .leftJoin(clinicDoctors, eq(surgeries.doctorId, clinicDoctors.id))
      .where(and(eq(surgeries.tenantId, tenantId), eq(surgeries.patientId, patientDbId)))
      .orderBy(desc(surgeries.surgeryDate))
      .limit(5),
  ]);

  return { patientVisits, patientPrescriptions, patientSurgeries };
}

// ─── Build system prompt ───────────────────────────────────────────────────────

function buildSystemPrompt(data: NonNullable<Awaited<ReturnType<typeof getAllClinicData>>>) {
  const { stats, currentDate, clinicName, allPatients, allDoctors, allSurgeryTypes, todayAppts, upcomingAppts, upcomingSurgs } = data;

  const patientsList = allPatients.length > 0
    ? allPatients.map(p =>
        `  • ${p.fullName} | ملف: ${p.patientId} | هاتف: ${p.phone ?? "غير مسجل"} | الحالة: ${p.status ?? "—"} | الجنس: ${p.gender === "male" ? "ذكر" : p.gender === "female" ? "أنثى" : "—"} | فصيلة الدم: ${p.bloodType ?? "—"} | أمراض مزمنة: ${p.chronicDiseases ?? "لا"} | حساسية: ${p.allergies ?? "لا"}`
      ).join("\n")
    : "  لا يوجد مرضى مسجلون بعد";

  const doctorsList = allDoctors.length > 0
    ? allDoctors.map(d =>
        `  • ${d.name} | التخصص: ${d.specialty ?? "—"} | هاتف: ${d.phone ?? "—"} | الحالة: ${d.isActive ? "نشط" : "غير نشط"}`
      ).join("\n")
    : "  لا يوجد أطباء مسجلون";

  const surgeryTypesList = allSurgeryTypes.length > 0
    ? allSurgeryTypes.map(s => `  • ${s.name}${s.description ? ` — ${s.description}` : ""}`).join("\n")
    : "  لا يوجد أنواع عمليات مسجلة";

  const todayApptsList = todayAppts.length > 0
    ? todayAppts.map(a =>
        `  • ${a.patientName ?? "—"} | الوقت: ${a.appointmentDate ? new Date(a.appointmentDate).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—"} | الطبيب: ${a.doctorName ?? "—"} | السبب: ${a.reason ?? "—"} | الحالة: ${a.status ?? "—"}`
      ).join("\n")
    : "  لا توجد مواعيد اليوم";

  const upcomingApptsList = upcomingAppts.length > 0
    ? upcomingAppts.map(a =>
        `  • ${a.patientName ?? "—"} | التاريخ: ${a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString("ar-EG") : "—"} | الطبيب: ${a.doctorName ?? "—"} | السبب: ${a.reason ?? "—"}`
      ).join("\n")
    : "  لا توجد مواعيد قادمة";

  const upcomingSurgsList = upcomingSurgs.length > 0
    ? upcomingSurgs.map(s =>
        `  • ${s.patientName ?? "—"} | التاريخ: ${s.surgeryDate ? new Date(s.surgeryDate).toLocaleDateString("ar-EG") : "—"} | نوع العملية: ${s.surgeryTypeName ?? "—"} | الطبيب: ${s.doctorName ?? "—"} | الحالة: ${s.status ?? "—"}`
      ).join("\n")
    : "  لا توجد عمليات جراحية قادمة";

  return `أنت مساعد ذكي لعيادة "${clinicName}". اسمك "مساعد العيادة". تتحدث باللغة العربية دائماً وتجيب بشكل مختصر وواضح.
لديك صلاحية الوصول الكامل لجميع بيانات العيادة الحقيقية المذكورة أدناه.

📅 **التاريخ الحالي:** ${currentDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **إحصائيات العيادة:**
- إجمالي المرضى: ${stats.totalPatients}
- مرضى جدد (3 أيام): ${stats.newPatientsLast3Days}
- مرضى جدد (7 أيام): ${stats.newPatientsLast7Days}
- مرضى جدد (30 يوم): ${stats.newPatientsLast30Days}
- زيارات (3 أيام): ${stats.visitsLast3Days}
- زيارات (7 أيام): ${stats.visitsLast7Days}
- زيارات (30 يوم): ${stats.visitsLast30Days}
- مواعيد اليوم: ${stats.todayAppointments}
- مواعيد قادمة (7 أيام): ${stats.upcomingAppointments}
- عمليات قادمة: ${stats.upcomingSurgeries}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍⚕️ **أطباء العيادة (${allDoctors.length} طبيب):**
${doctorsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔪 **أنواع العمليات الجراحية:**
${surgeryTypesList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **مواعيد اليوم (${todayAppts.length} موعد):**
${todayApptsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 **المواعيد القادمة (7 أيام):**
${upcomingApptsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 **العمليات الجراحية القادمة:**
${upcomingSurgsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧑‍🤝‍🧑 **قائمة المرضى المسجلين (${allPatients.length} مريض):**
${patientsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**تعليمات:**
- أجب فقط بناءً على البيانات المذكورة أعلاه.
- إذا سُئلت عن مريض، ابحث في قائمة المرضى بالاسم أو جزء منه وأعطِ كل معلوماته.
- إذا سُئلت عن طبيب، ابحث في قائمة الأطباء وأعطِ كل معلوماته.
- لا تخترع أي معلومات غير موجودة في البيانات.
- إذا لم تجد المعلومة، قل "لا توجد هذه المعلومة في النظام حالياً".`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiAssistantRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get tenantId
      const tenantIdRaw = await getTenantId(ctx.user.email ?? "");
      const tenantId = tenantIdRaw ?? 0;

      // 2. Fetch ALL clinic data for this tenant
      const clinicData = await getAllClinicData(tenantId);

      // 3. Build system prompt with full data
      const systemPrompt = clinicData
        ? buildSystemPrompt(clinicData)
        : `أنت مساعد ذكي لعيادة طبية. تتحدث باللغة العربية دائماً. قاعدة البيانات غير متاحة حالياً.`;

      // 4. Check if user is asking about a specific patient — fetch full history
      const lastUserMsg = input.messages[input.messages.length - 1]?.content ?? "";
      let extraContext = "";

      if (clinicData && clinicData.allPatients.length > 0) {
        // Normalize message (strip diacritics)
        const msgNormalized = lastUserMsg.replace(/[ًٌٍَُِّْ]/g, "").toLowerCase();

        // Try to find a matching patient by any part of their name
        const matchedPatient = clinicData.allPatients.find(p => {
          const nameParts = p.fullName.replace(/[ًٌٍَُِّْ]/g, "").split(/\s+/);
          return nameParts.some(part => part.length >= 2 && msgNormalized.includes(part.toLowerCase()));
        });

        if (matchedPatient) {
          const fullData = await getFullPatientData(matchedPatient.id, tenantId);
          if (fullData) {
            const { patientVisits, patientPrescriptions, patientSurgeries } = fullData;

            const visitsText = patientVisits.length > 0
              ? patientVisits.map((v, i) =>
                  `  ${i + 1}. ${v.visitDate ? new Date(v.visitDate).toLocaleDateString("ar-EG") : "—"} | التشخيص: ${v.diagnosisText ?? v.chiefComplaint ?? "—"} | ملاحظات: ${v.doctorNotes ?? "—"} | المتابعة: ${v.followUpDate ? new Date(v.followUpDate).toLocaleDateString("ar-EG") : "لا"}`
                ).join("\n")
              : "  لا توجد زيارات مسجلة";

            const rxText = patientPrescriptions.length > 0
              ? patientPrescriptions.map((rx, i) => {
                  const meds = Array.isArray(rx.medications)
                    ? rx.medications.map((m: any) => m.medicine ?? m.name ?? "").filter(Boolean).join("، ")
                    : "—";
                  return `  ${i + 1}. ${rx.prescriptionDate ? new Date(rx.prescriptionDate).toLocaleDateString("ar-EG") : "—"} | ${rx.treatmentName ?? meds} | ملاحظات: ${rx.notes ?? "—"}`;
                }).join("\n")
              : "  لا توجد وصفات مسجلة";

            const surgsText = patientSurgeries.length > 0
              ? patientSurgeries.map((s, i) =>
                  `  ${i + 1}. ${s.surgeryDate ? new Date(s.surgeryDate).toLocaleDateString("ar-EG") : "—"} | ${s.surgeryTypeName ?? "—"} | الطبيب: ${s.doctorName ?? "—"} | الحالة: ${s.status ?? "—"}`
                ).join("\n")
              : "  لا توجد عمليات مسجلة";

            extraContext = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 **تفاصيل المريض المطلوب: ${matchedPatient.fullName}**
- رقم الملف: ${matchedPatient.patientId}
- الهاتف: ${matchedPatient.phone ?? "غير مسجل"}
- الجنس: ${matchedPatient.gender === "male" ? "ذكر" : matchedPatient.gender === "female" ? "أنثى" : "غير محدد"}
- تاريخ الميلاد: ${matchedPatient.dateOfBirth ? new Date(matchedPatient.dateOfBirth).toLocaleDateString("ar-EG") : "غير مسجل"}
- الحالة: ${matchedPatient.status ?? "—"}
- فصيلة الدم: ${matchedPatient.bloodType ?? "غير مسجلة"}
- الحساسية: ${matchedPatient.allergies ?? "لا يوجد"}
- الأمراض المزمنة: ${matchedPatient.chronicDiseases ?? "لا يوجد"}
- ملاحظات طبية: ${matchedPatient.medicalNotes ?? "لا يوجد"}
- تاريخ التسجيل: ${matchedPatient.createdAt ? new Date(matchedPatient.createdAt).toLocaleDateString("ar-EG") : "—"}

**الزيارات (${patientVisits.length}):**
${visitsText}

**الوصفات الطبية (${patientPrescriptions.length}):**
${rxText}

**العمليات الجراحية (${patientSurgeries.length}):**
${surgsText}`;
          }
        }
      }

      // 5. Call LLM
      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt + extraContext },
          ...input.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        maxTokens: 1500,
      });

      const reply = result.choices[0]?.message?.content;
      const text =
        typeof reply === "string"
          ? reply
          : Array.isArray(reply)
          ? reply.map((p: any) => p.text ?? "").join("")
          : "عذراً، لم أتمكن من الإجابة.";

      return { reply: text };
    }),
});
