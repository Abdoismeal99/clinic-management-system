import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb, getTenantId } from "../db";
import { patients, visits, appointments, prescriptions, surgeries, clinicDoctors, surgeryTypes } from "../../drizzle/schema";
import { and, count, desc, eq, gte, like, lte, sql } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getClinicSnapshot(tenantId: number) {
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
    upcomingSurgeries,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), gte(patients.createdAt, threeDaysAgo))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), gte(patients.createdAt, sevenDaysAgo))),
    db.select({ cnt: count() }).from(patients).where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), gte(patients.createdAt, thirtyDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.tenantId, tenantId), eq(visits.isDeleted, false), gte(visits.visitDate, threeDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.tenantId, tenantId), eq(visits.isDeleted, false), gte(visits.visitDate, sevenDaysAgo))),
    db.select({ cnt: count() }).from(visits).where(and(eq(visits.tenantId, tenantId), eq(visits.isDeleted, false), gte(visits.visitDate, thirtyDaysAgo))),
    db.select({ cnt: count() }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.isDeleted, false), gte(appointments.appointmentDate, todayStart), lte(appointments.appointmentDate, todayEnd))),
    db.select({ cnt: count() }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.isDeleted, false), gte(appointments.appointmentDate, now))),
    db.select({ cnt: count() }).from(surgeries).where(and(eq(surgeries.tenantId, tenantId), gte(surgeries.surgeryDate, now))),
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
    upcomingSurgeries: upcomingSurgeries[0]?.cnt ?? 0,
    currentDate: now.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  };
}

async function searchPatientByName(name: string, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
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
    .where(and(eq(patients.tenantId, tenantId), eq(patients.isDeleted, false), like(patients.fullName, `%${name}%`)))
    .limit(5);
}

async function getPatientVisits(patientId: number, tenantId: number) {
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
    .where(and(eq(visits.tenantId, tenantId), eq(visits.patientId, patientId), eq(visits.isDeleted, false)))
    .orderBy(desc(visits.visitDate))
    .limit(10);
}

async function getPatientPrescriptions(patientId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: prescriptions.id,
    prescriptionDate: prescriptions.prescriptionDate,
    medications: prescriptions.medications,
    treatmentName: prescriptions.treatmentName,
    notes: prescriptions.notes,
  }).from(prescriptions)
    .where(and(eq(prescriptions.tenantId, tenantId), eq(prescriptions.patientId, patientId), eq(prescriptions.isDeleted, false)))
    .orderBy(desc(prescriptions.prescriptionDate))
    .limit(5);
}

// Extract all possible name candidates from a message (2+ word sequences)
function extractNameCandidates(message: string): string[] {
  const stopWords = new Set([
    "من", "في", "على", "عن", "مع", "هل", "ما", "ماذا", "كيف", "متى", "أين", "لماذا",
    "اللي", "الي", "طلعلي", "اطلع", "اعرف", "ابحث", "بحث", "مريض", "حالة", "رقم",
    "اسم", "بيانات", "ملف", "تليفون", "موبايل", "هاتف", "دكتور", "عيادة", "انا",
    "انت", "هو", "هي", "احنا", "عايز", "عاوز", "ممكن", "لو", "لو", "كده", "كدا",
    "ايه", "إيه", "بتاع", "بتاعت", "جيبلي", "جيب", "وريني", "ورني", "شوفلي",
    "اخر", "آخر", "اول", "أول", "كل", "جميع", "بعض",
  ]);

  const words = message.split(/[\s،,؟?!.]+/).filter(w => w.length >= 2);
  const candidates: string[] = [];

  // Single words not in stopwords
  for (const w of words) {
    if (!stopWords.has(w)) {
      candidates.push(w);
    }
  }

  // Two-word combinations
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      candidates.push(`${words[i]} ${words[i + 1]}`);
    }
  }

  return candidates;
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
    .mutation(async ({ ctx, input }) => {
            // 1. Get tenantId for this user
      const tenantIdRaw = await getTenantId(ctx.user.email ?? "");
      const tenantId = tenantIdRaw ?? 0;
      // 2. Get clinic snapshot filtered by tenant
      const snapshot = await getClinicSnapshot(tenantId);

      // 3. Build system prompt
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
- عمليات جراحية قادمة: ${snapshot?.upcomingSurgeries ?? 0}

**تعليمات مهمة:**
- أجب فقط بناءً على البيانات المقدمة لك. لا تخترع أي معلومات.
- إذا لم تجد المعلومة في البيانات المتاحة، قل بصراحة "لا توجد هذه المعلومة في النظام".
- أجب بشكل مختصر وواضح باللغة العربية.
- إذا سأل عن مريض ولم يُذكر اسمه، اطلب منه ذكر الاسم.`;

      // 4. Search for patient if query seems to be about a specific patient
      const lastUserMsg = input.messages[input.messages.length - 1]?.content ?? "";
      let patientContext = "";

      const patientKeywords = ["مريض", "حالة", "رقم", "اسم", "بيانات", "ملف", "تليفون", "موبايل", "هاتف", "طلعلي", "وريني", "جيبلي", "شوفلي"];
      const hasPatientQuery = patientKeywords.some(k => lastUserMsg.includes(k));

      if (hasPatientQuery && tenantId !== null) {
        const candidates = extractNameCandidates(lastUserMsg);

        for (const candidate of candidates) {
          const found = await searchPatientByName(candidate, tenantId);
          if (found.length > 0) {
            const p = found[0];
            const pVisits = await getPatientVisits(p.id, tenantId);
            const pPrescriptions = await getPatientPrescriptions(p.id, tenantId);

            patientContext = `\n\n**✅ بيانات المريض الذي تم العثور عليه:**
- الاسم الكامل: ${p.fullName}
- رقم الملف: ${p.patientId}
- رقم الهاتف: ${p.phone ?? "غير مسجل"}
- الجنس: ${p.gender === "male" ? "ذكر" : p.gender === "female" ? "أنثى" : "غير محدد"}
- تاريخ الميلاد: ${p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("ar-EG") : "غير مسجل"}
- الحالة: ${p.status ?? "غير محدد"}
- فصيلة الدم: ${p.bloodType ?? "غير مسجلة"}
- الحساسية: ${p.allergies ?? "لا يوجد"}
- الأمراض المزمنة: ${p.chronicDiseases ?? "لا يوجد"}
- ملاحظات طبية: ${p.medicalNotes ?? "لا يوجد"}
- تاريخ التسجيل: ${new Date(p.createdAt!).toLocaleDateString("ar-EG")}

**آخر زيارات المريض (${pVisits.length} زيارة مسجلة):**
${pVisits.slice(0, 3).map((v, i) => `${i + 1}. ${new Date(v.visitDate!).toLocaleDateString("ar-EG")} — التشخيص: ${v.diagnosisText ?? v.chiefComplaint ?? "—"} — ملاحظات: ${v.doctorNotes ?? "—"}`).join("\n") || "لا توجد زيارات مسجلة"}

**آخر وصفات طبية (${pPrescriptions.length} وصفة):**
${pPrescriptions.slice(0, 3).map((rx, i) => {
  const meds = Array.isArray(rx.medications) ? rx.medications.map((m: any) => m.medicine ?? m.name ?? "").filter(Boolean).join("، ") : "—";
  return `${i + 1}. ${new Date(rx.prescriptionDate!).toLocaleDateString("ar-EG")} — ${rx.treatmentName ?? meds}`;
}).join("\n") || "لا توجد وصفات مسجلة"}`;
            break;
          }
        }

        // If no patient found, tell the AI
        if (!patientContext) {
          patientContext = `\n\n**⚠️ ملاحظة:** تم البحث في قاعدة البيانات ولم يُعثر على مريض بهذا الاسم. أخبر الطبيب بذلك وأطلب منه التأكد من الاسم.`;
        }
      }

      // 5. Call LLM
      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt + patientContext },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        maxTokens: 1200,
      });

      const reply = result.choices[0]?.message?.content;
      const text = typeof reply === "string" ? reply : Array.isArray(reply) ? reply.map((p: any) => p.text ?? "").join("") : "عذراً، لم أتمكن من الإجابة.";

      return { reply: text };
    }),
});
