import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { patients, visits, appointments, prescriptions } from "../../drizzle/schema";
import { and, count, desc, eq, gte, ilike, like, lte, or, sql } from "drizzle-orm";

// ─── Helpers to gather clinic context ─────────────────────────────────────────

async function getClinicSnapshot() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalPatients,
    newPatientsLast3Days,
    newPatientsLast7Days,
    newPatientsLast30Days,
    visitsLast3Days,
    visitsLast7Days,
    visitsLast30Days,
    todayAppointments,
    upcomingAppointments,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(patients).where(eq(patients.isDeleted, false)),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.isDeleted, false), gte(patients.createdAt, threeDaysAgo))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.isDeleted, false), gte(patients.createdAt, sevenDaysAgo))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.isDeleted, false), gte(patients.createdAt, thirtyDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.isDeleted, false), gte(visits.visitDate, threeDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.isDeleted, false), gte(visits.visitDate, sevenDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.isDeleted, false), gte(visits.visitDate, thirtyDaysAgo))),
    db.select({ cnt: count() }).from(appointments).where(and(eq(appointments.isDeleted, false), gte(appointments.appointmentDate, todayStart), lte(appointments.appointmentDate, todayEnd))),
    db.select({ cnt: count() }).from(appointments).where(and(eq(appointments.isDeleted, false), gte(appointments.appointmentDate, now))),
  ]);

  return {
    totalPatients: totalPatients[0]?.cnt ?? 0,
    newPatientsLast3Days: newPatientsLast3Days[0]?.cnt ?? 0,
    newPatientsLast7Days: newPatientsLast7Days[0]?.cnt ?? 0,
    newPatientsLast30Days: newPatientsLast30Days[0]?.cnt ?? 0,
    visitsLast3Days: visitsLast3Days[0]?.cnt ?? 0,
    visitsLast7Days: visitsLast7Days[0]?.cnt ?? 0,
    visitsLast30Days: visitsLast30Days[0]?.cnt ?? 0,
    todayAppointments: todayAppointments[0]?.cnt ?? 0,
    upcomingAppointments: upcomingAppointments[0]?.cnt ?? 0,
    currentDate: now.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  };
}

async function searchPatientByName(name: string) {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select({
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
  }).from(patients)
    .where(and(eq(patients.isDeleted, false), like(patients.fullName, `%${name}%`)))
    .limit(5);
  return results;
}

async function getPatientVisits(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: visits.id,
    visitDate: visits.visitDate,
    diagnosisText: visits.diagnosisText,
    chiefComplaint: visits.chiefComplaint,
    symptoms: visits.symptoms,
    doctorNotes: visits.doctorNotes,
    status: visits.status,
    followUpDate: visits.followUpDate,
  }).from(visits)
    .where(and(eq(visits.patientId, patientId), eq(visits.isDeleted, false)))
    .orderBy(desc(visits.visitDate))
    .limit(10);
}

async function getPatientPrescriptions(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: prescriptions.id,
    prescriptionDate: prescriptions.prescriptionDate,
    medications: prescriptions.medications,
    treatmentName: prescriptions.treatmentName,
    notes: prescriptions.notes,
  }).from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.isDeleted, false)))
    .orderBy(desc(prescriptions.prescriptionDate))
    .limit(5);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiAssistantRouter = router({
  chat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      // 1. Get clinic snapshot for context
      const snapshot = await getClinicSnapshot();

      // 2. Build system prompt with clinic data
      const systemPrompt = `أنت مساعد ذكي لعيادة طبية. اسمك "مساعد العيادة". تتحدث باللغة العربية دائماً.
لديك صلاحية الوصول لبيانات العيادة الحقيقية وتستطيع الإجابة على أسئلة الطبيب بدقة.

📊 **إحصائيات العيادة الحالية (${snapshot?.currentDate ?? "اليوم"}):**
- إجمالي المرضى المسجلين: ${snapshot?.totalPatients ?? 0} مريض
- مرضى جدد آخر 3 أيام: ${snapshot?.newPatientsLast3Days ?? 0}
- مرضى جدد آخر 7 أيام: ${snapshot?.newPatientsLast7Days ?? 0}
- مرضى جدد آخر 30 يوم: ${snapshot?.newPatientsLast30Days ?? 0}
- زيارات آخر 3 أيام: ${snapshot?.visitsLast3Days ?? 0}
- زيارات آخر 7 أيام: ${snapshot?.visitsLast7Days ?? 0}
- زيارات آخر 30 يوم: ${snapshot?.visitsLast30Days ?? 0}
- مواعيد اليوم: ${snapshot?.todayAppointments ?? 0}
- مواعيد قادمة: ${snapshot?.upcomingAppointments ?? 0}

**تعليمات مهمة:**
- إذا سأل الطبيب عن مريض بالاسم (مثل "طلعلي رقم فلان" أو "حالة فلان")، أخبره أنك ستبحث عنه وأجب بالبيانات المتاحة.
- أجب بشكل مختصر وواضح.
- إذا لم تجد معلومة، قل ذلك بصراحة.
- لا تخترع بيانات غير موجودة.`;

      // 3. Check if the last user message asks about a specific patient
      const lastUserMsg = input.messages[input.messages.length - 1]?.content ?? "";
      let patientContext = "";

      // Simple name extraction: look for patterns like "فلان" or a name after keywords
      const patientKeywords = ["مريض", "حالة", "رقم", "اسم", "بيانات", "ملف", "تليفون", "موبايل", "هاتف"];
      const hasPatientQuery = patientKeywords.some(k => lastUserMsg.includes(k));

      if (hasPatientQuery) {
        // Extract potential name: words that are 2+ chars, not keywords
        const stopWords = new Set(["من", "في", "على", "عن", "مع", "هل", "ما", "ماذا", "كيف", "متى", "أين", "لماذا", "اللي", "الي", "طلعلي", "اطلع", "اعرف", "ابحث", "بحث", "مريض", "حالة", "رقم", "اسم", "بيانات", "ملف", "تليفون", "موبايل", "هاتف", "دكتور", "عيادة"]);
        const words = lastUserMsg.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));

        for (const word of words) {
          const found = await searchPatientByName(word);
          if (found.length > 0) {
            const p = found[0];
            const pVisits = await getPatientVisits(p.id);
            const pPrescriptions = await getPatientPrescriptions(p.id);

            patientContext = `\n\n**بيانات المريض الذي تم العثور عليه:**
- الاسم: ${p.fullName}
- رقم الملف: ${p.patientId}
- رقم الهاتف: ${p.phone ?? "غير مسجل"}
- الجنس: ${p.gender === "male" ? "ذكر" : p.gender === "female" ? "أنثى" : "غير محدد"}
- تاريخ الميلاد: ${p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("ar-EG") : "غير مسجل"}
- الحالة: ${p.status ?? "غير محدد"}
- فصيلة الدم: ${p.bloodType ?? "غير مسجلة"}
- الحساسية: ${p.allergies ?? "لا يوجد"}
- الأمراض المزمنة: ${p.chronicDiseases ?? "لا يوجد"}
- ملاحظات: ${p.medicalNotes ?? "لا يوجد"}
- تاريخ التسجيل: ${new Date(p.createdAt!).toLocaleDateString("ar-EG")}

**آخر زيارات المريض (${pVisits.length} زيارة):**
${pVisits.slice(0, 3).map((v, i) => `${i + 1}. ${new Date(v.visitDate!).toLocaleDateString("ar-EG")} — التشخيص: ${v.diagnosisText ?? v.chiefComplaint ?? "—"} — ملاحظات: ${v.doctorNotes ?? "—"}`).join("\n") || "لا توجد زيارات مسجلة"}

**آخر وصفات طبية (${pPrescriptions.length}):**
${pPrescriptions.slice(0, 2).map((rx, i) => { const meds = Array.isArray(rx.medications) ? rx.medications.map((m: any) => m.medicine).join("، ") : "—"; return `${i + 1}. ${new Date(rx.prescriptionDate!).toLocaleDateString("ar-EG")} — ${rx.treatmentName ?? meds}`; }).join("\n") || "لا توجد وصفات مسجلة"}`;
            break;
          }
        }
      }

      // 4. Call LLM
      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt + patientContext },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        maxTokens: 1000,
      });

      const reply = result.choices[0]?.message?.content;
      const text = typeof reply === "string" ? reply : Array.isArray(reply) ? reply.map((p: any) => p.text ?? "").join("") : "عذراً، لم أتمكن من الإجابة.";

      return { reply: text };
    }),
});
