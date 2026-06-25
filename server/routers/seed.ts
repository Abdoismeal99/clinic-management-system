import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { patients, visits, prescriptions, appointments, diagnoses, activityLogs, settings } from "../../drizzle/schema";

const DEMO_PATIENTS = [
  { fullName: "Ahmed Al-Rashidi", gender: "male" as const, phone: "+966501234567", bloodType: "A+" as const, status: "stable" as const, occupation: "Engineer", chronicDiseases: "Hypertension", allergies: "Penicillin", dateOfBirth: new Date("1975-03-15") },
  { fullName: "Fatima Al-Zahra", gender: "female" as const, phone: "+966502345678", bloodType: "O+" as const, status: "follow-up" as const, occupation: "Teacher", chronicDiseases: "Diabetes Type 2", allergies: "Sulfa drugs", dateOfBirth: new Date("1982-07-22") },
  { fullName: "Mohammed Al-Otaibi", gender: "male" as const, phone: "+966503456789", bloodType: "B+" as const, status: "new" as const, occupation: "Businessman", chronicDiseases: "", allergies: "", dateOfBirth: new Date("1990-11-08") },
  { fullName: "Nora Al-Ghamdi", gender: "female" as const, phone: "+966504567890", bloodType: "AB+" as const, status: "critical" as const, occupation: "Nurse", chronicDiseases: "Asthma, Hypertension", allergies: "Aspirin", dateOfBirth: new Date("1968-05-30") },
  { fullName: "Khalid Al-Shehri", gender: "male" as const, phone: "+966505678901", bloodType: "O-" as const, status: "stable" as const, occupation: "Doctor", chronicDiseases: "None", allergies: "None", dateOfBirth: new Date("1985-09-12") },
  { fullName: "Sara Al-Dosari", gender: "female" as const, phone: "+966506789012", bloodType: "A-" as const, status: "new" as const, occupation: "Student", chronicDiseases: "", allergies: "Latex", dateOfBirth: new Date("2000-01-20") },
  { fullName: "Omar Al-Harbi", gender: "male" as const, phone: "+966507890123", bloodType: "B-" as const, status: "follow-up" as const, occupation: "Accountant", chronicDiseases: "Diabetes Type 1", allergies: "", dateOfBirth: new Date("1978-12-05") },
  { fullName: "Aisha Al-Mutairi", gender: "female" as const, phone: "+966508901234", bloodType: "AB-" as const, status: "stable" as const, occupation: "Pharmacist", chronicDiseases: "Hypothyroidism", allergies: "Ibuprofen", dateOfBirth: new Date("1992-04-18") },
];

const DEMO_DIAGNOSES = [
  { name: "Hypertension", category: "Cardiovascular", color: "#EF4444" },
  { name: "Diabetes Type 2", category: "Endocrine", color: "#F97316" },
  { name: "Asthma", category: "Respiratory", color: "#3B82F6" },
  { name: "Fracture", category: "Orthopedic", color: "#8B5CF6" },
  { name: "Pregnancy", category: "Obstetrics", color: "#EC4899" },
  { name: "Infection", category: "Infectious", color: "#10B981" },
  { name: "Migraine", category: "Neurology", color: "#6366F1" },
  { name: "Anemia", category: "Hematology", color: "#F59E0B" },
  { name: "Gastritis", category: "Gastroenterology", color: "#84CC16" },
  { name: "Anxiety", category: "Psychiatry", color: "#06B6D4" },
];

const DEMO_SETTINGS = [
  { key: "clinic_name", value: "Al-Shifa Medical Clinic" },
  { key: "clinic_address", value: "123 King Fahd Road, Riyadh, Saudi Arabia" },
  { key: "clinic_phone", value: "+966-11-234-5678" },
  { key: "clinic_email", value: "info@alshifa-clinic.com" },
  { key: "clinic_website", value: "www.alshifa-clinic.com" },
  { key: "clinic_working_hours", value: "Sun-Thu: 8:00 AM - 8:00 PM" },
  { key: "prescription_header", value: "Al-Shifa Medical Clinic - Dr. Ahmed Al-Rashidi, MD" },
  { key: "language", value: "en" },
];

export const seedRouter = router({
  run: protectedProcedure
    .input(z.object({ confirm: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      if (!input.confirm) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirm must be true" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Seed diagnoses
      for (const d of DEMO_DIAGNOSES) {
        try { await db.insert(diagnoses).values(d); } catch { /* skip duplicates */ }
      }

      // Seed settings
      for (const s of DEMO_SETTINGS) {
        await db.insert(settings).values(s).onDuplicateKeyUpdate({ set: { value: s.value } });
      }

      // Seed patients
      const patientIds: number[] = [];
      for (let i = 0; i < DEMO_PATIENTS.length; i++) {
        const p = DEMO_PATIENTS[i];
        const patientId = `PT${String(i + 1).padStart(5, "0")}`;
        try {
          const result = await db.insert(patients).values({
            ...p,
            patientId,
            createdBy: ctx.user.id,
            medicalNotes: `Demo patient - ${p.occupation}`,
            emergencyContactName: "Family Member",
            emergencyContactPhone: "+966500000000",
            emergencyContactRelation: "Spouse",
          });
          patientIds.push((result[0] as any).insertId);
        } catch { /* skip if exists */ }
      }

      // Seed visits for first 4 patients
      const visitData = [
        { diagnosisText: "Hypertension - Stage 1", symptoms: "Headache, dizziness, blurred vision", diagnosisTags: ["Hypertension"], doctorNotes: "Patient advised to reduce sodium intake and increase physical activity. BP monitoring required daily." },
        { diagnosisText: "Diabetes Type 2 - Uncontrolled", symptoms: "Polyuria, polydipsia, fatigue, blurred vision", diagnosisTags: ["Diabetes Type 2"], doctorNotes: "HbA1c elevated at 9.2%. Medication adjusted. Diet counseling provided." },
        { diagnosisText: "Upper Respiratory Tract Infection", symptoms: "Sore throat, runny nose, mild fever, cough", diagnosisTags: ["Infection"], doctorNotes: "Viral URTI. Symptomatic treatment prescribed. Rest and hydration advised." },
        { diagnosisText: "Acute Asthma Exacerbation", symptoms: "Shortness of breath, wheezing, chest tightness", diagnosisTags: ["Asthma"], doctorNotes: "Nebulization given in clinic. Inhaler technique reviewed. Follow-up in 1 week." },
      ];

      for (let i = 0; i < Math.min(patientIds.length, visitData.length); i++) {
        const pid = patientIds[i];
        if (!pid) continue;
        const vd = visitData[i];
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - (i * 7 + 3));
        try {
          await db.insert(visits).values({
            patientId: pid,
            doctorId: ctx.user.id,
            visitDate,
            chiefComplaint: vd.symptoms.split(",")[0].trim(),
            symptoms: vd.symptoms,
            diagnosisText: vd.diagnosisText,
            diagnosisTags: vd.diagnosisTags,
            bloodPressureSystolic: 130 + i * 5,
            bloodPressureDiastolic: 85 + i * 3,
            heartRate: 72 + i * 4,
            temperature: "37.2",
            weight: "75.0",
            height: "170.0",
            oxygenSaturation: 98 - i,
            doctorNotes: vd.doctorNotes,
            followUpDate: new Date(Date.now() + (7 + i * 3) * 24 * 60 * 60 * 1000),
            status: "completed",
            createdBy: ctx.user.id,
          });
        } catch { /* skip */ }
      }

      // Seed prescriptions
      const rxData = [
        { medications: [{ medicine: "Amlodipine", dose: "5mg", frequency: "Once daily", duration: "30 days", instructions: "Take in the morning with water" }, { medicine: "Atorvastatin", dose: "20mg", frequency: "Once daily at night", duration: "30 days", instructions: "Take at bedtime" }] },
        { medications: [{ medicine: "Metformin", dose: "500mg", frequency: "Twice daily with meals", duration: "30 days", instructions: "Take with food to reduce GI side effects" }, { medicine: "Glibenclamide", dose: "5mg", frequency: "Once daily before breakfast", duration: "30 days", instructions: "Monitor blood sugar regularly" }] },
      ];

      for (let i = 0; i < Math.min(patientIds.length, rxData.length); i++) {
        const pid = patientIds[i];
        if (!pid) continue;
        try {
          await db.insert(prescriptions).values({
            patientId: pid,
            doctorId: ctx.user.id,
            medications: rxData[i].medications,
            createdBy: ctx.user.id,
          });
        } catch { /* skip */ }
      }

      // Seed appointments
      for (let i = 0; i < Math.min(patientIds.length, 6); i++) {
        const pid = patientIds[i];
        if (!pid) continue;
        const apptDate = new Date();
        apptDate.setDate(apptDate.getDate() + i);
        apptDate.setHours(9 + i, 0, 0, 0);
        try {
          await db.insert(appointments).values({
            patientId: pid,
            doctorId: ctx.user.id,
            appointmentDate: apptDate,
            duration: 30,
            reason: i === 0 ? "Follow-up visit" : i === 1 ? "Lab results review" : "Routine checkup",
            status: i < 2 ? "pending" : "pending",
            createdBy: ctx.user.id,
          });
        } catch { /* skip */ }
      }

      // Log seed activity
      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        action: "seed_data_created",
        description: "Demo seed data created successfully",
      });

      return { success: true, message: "Demo data seeded successfully" };
    }),
});
