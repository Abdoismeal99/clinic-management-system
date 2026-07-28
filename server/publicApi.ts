/**
 * Public REST API for n8n bot integration — v2.0 (per-tenant API keys)
 *
 * Each tenant (doctor/clinic) has their own botApiKey stored in the tenants table.
 * Pass the key in the X-Api-Key header. The tenantId is resolved automatically.
 *
 * Endpoints:
 *   GET  /api/public/health    - Health check (no auth)
 *   POST /api/public/patients  - Register a new patient from bot
 *   GET  /api/public/patients  - Search patients by name or phone
 */
import { Express, Request, Response } from "express";
import { createPatient, generatePatientId, getPatients, getDb } from "./db";
import { tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Per-Tenant API Key Auth ──────────────────────────────────────────────────
async function resolveTenantByApiKey(
  apiKey: string
): Promise<{ id: number; clinicName: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ id: tenants.id, clinicName: tenants.clinicName })
    .from(tenants)
    .where(eq(tenants.botApiKey, apiKey))
    .limit(1);
  return result[0] ?? null;
}

async function authenticateAndGetTenant(
  req: Request,
  res: Response
): Promise<{ id: number; clinicName: string } | null> {
  const apiKey =
    (req.headers["x-api-key"] as string) ||
    (req.headers["authorization"] as string)?.replace(/^Bearer\s+/i, "");

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: "Missing API key. Pass it in the X-Api-Key header.",
    });
    return null;
  }

  const tenant = await resolveTenantByApiKey(apiKey.trim());
  if (!tenant) {
    res.status(401).json({ success: false, error: "Invalid API key." });
    return null;
  }
  return tenant;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /api/public/patients
 * Register a new patient from an n8n bot.
 *
 * Headers:
 *   X-Api-Key: <your clinic bot API key>
 *
 * Body (JSON):
 *   name     (required) - Patient full name
 *   phone    (optional) - Patient phone number
 *   platform (optional) - facebook | instagram | whatsapp | manual  (default: manual)
 *   gender   (optional) - male | female | other  (default: other)
 *   notes    (optional) - Medical notes
 */
async function createPatientHandler(req: Request, res: Response) {
  const tenant = await authenticateAndGetTenant(req, res);
  if (!tenant) return;

  try {
    const {
      name,
      phone,
      platform = "manual",
      gender = "other",
      notes,
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Validation error: 'name' is required",
      });
    }

    const validPlatforms = ["facebook", "instagram", "whatsapp", "manual"];
    const normalizedPlatform = validPlatforms.includes(platform) ? platform : "manual";
    const validGenders = ["male", "female", "other"];
    const normalizedGender = validGenders.includes(gender) ? gender : "other";

    // Deduplicate by phone within this tenant
    if (phone && typeof phone === "string" && phone.trim().length > 0) {
      const existing = await getPatients({
        search: phone.trim(),
        tenantId: tenant.id,
        limit: 1,
      });
      if (existing.data.length > 0) {
        const p = existing.data[0];
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: "Patient with this phone number already exists",
          patient: {
            id: p.id,
            patientId: p.patientId,
            name: p.fullName,
            phone: p.phone,
            platform: p.platform,
            source: p.source,
            createdAt: p.createdAt,
          },
        });
      }
    }

    const patientId = await generatePatientId();
    const newId = await createPatient({
      tenantId: tenant.id,
      patientId,
      fullName: name.trim(),
      phone: phone?.trim() || null,
      gender: normalizedGender as "male" | "female" | "other",
      platform: normalizedPlatform as "facebook" | "instagram" | "whatsapp" | "manual",
      source: "bot",
      medicalNotes: notes?.trim() || null,
      createdBy: 0, // 0 = system/bot
      status: "new",
      isDeleted: false,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient: {
        id: newId,
        patientId,
        name: name.trim(),
        phone: phone?.trim() || null,
        platform: normalizedPlatform,
        source: "bot",
        tenantId: tenant.id,
        clinicName: tenant.clinicName,
      },
    });
  } catch (error: any) {
    console.error("[PublicAPI] Error creating patient:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /api/public/patients
 * Search patients belonging to the authenticated tenant.
 *
 * Headers:
 *   X-Api-Key: <your clinic bot API key>
 *
 * Query params:
 *   search  (optional) - Search by name or phone
 *   phone   (optional) - Exact phone search
 *   limit   (optional) - Max results (default: 10, max: 50)
 */
async function searchPatientsHandler(req: Request, res: Response) {
  const tenant = await authenticateAndGetTenant(req, res);
  if (!tenant) return;

  try {
    const { search, phone, limit = 10 } = req.query;
    const searchTerm = (search as string) || (phone as string) || "";
    const limitNum = Math.min(Number(limit) || 10, 50);

    const result = await getPatients({
      search: searchTerm,
      tenantId: tenant.id,
      limit: limitNum,
      page: 1,
    });

    return res.status(200).json({
      success: true,
      total: result.total,
      tenantId: tenant.id,
      clinicName: tenant.clinicName,
      patients: result.data.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        name: p.fullName,
        phone: p.phone,
        gender: p.gender,
        platform: p.platform,
        source: p.source,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[PublicAPI] Error searching patients:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /api/public/health
 * Health check (no auth required)
 */
function healthHandler(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    service: "Clinic Management System - Public API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
}

// ─── Register Routes ──────────────────────────────────────────────────────────
export function registerPublicApi(app: Express) {
  app.get("/api/public/health", healthHandler);
  app.post("/api/public/patients", createPatientHandler);
  app.get("/api/public/patients", searchPatientsHandler);
  console.log("[PublicAPI] Routes registered: POST/GET /api/public/patients (per-tenant auth v2)");
}
