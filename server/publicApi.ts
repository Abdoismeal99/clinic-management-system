/**
 * Public REST API for n8n bot integration
 * Allows external bots (Facebook/Instagram/WhatsApp) to register patients
 * and search for existing patients using an API key.
 *
 * Endpoints:
 *   POST /api/public/patients  - Create a new patient from bot
 *   GET  /api/public/patients  - Search patients by name or phone
 */

import { Express, Request, Response } from "express";
import { createPatient, generatePatientId, getPatients } from "./db";
import { getDb } from "./db";
import { tenants } from "../drizzle/schema";

// ─── API Key Authentication ───────────────────────────────────────────────────
// The API key is stored as BOT_API_KEY env variable.
// Each tenant can have their own API key stored in the tenants table (botApiKey column),
// but for simplicity we use a global key from env. The tenantId is passed in the request body.
function getBotApiKey(): string {
  return process.env.BOT_API_KEY || "clinic-bot-api-key-2026";
}

function authenticateApiKey(req: Request, res: Response): boolean {
  const apiKey =
    req.headers["x-api-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!apiKey || apiKey !== getBotApiKey()) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing API key",
    });
    return false;
  }
  return true;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /api/public/patients
 * Create a new patient from an external bot.
 *
 * Body:
 *   name     (required) - Patient full name
 *   phone    (optional) - Patient phone number
 *   platform (optional) - facebook | instagram | whatsapp | manual (default: manual)
 *   gender   (optional) - male | female | other (default: other)
 *   notes    (optional) - Medical notes
 *   tenantId (optional) - Tenant ID (default: 1)
 */
async function createPatientHandler(req: Request, res: Response) {
  if (!authenticateApiKey(req, res)) return;

  try {
    const {
      name,
      phone,
      platform = "manual",
      gender = "other",
      notes,
      tenantId = 1,
    } = req.body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Validation error: 'name' is required",
      });
    }

    // Validate platform
    const validPlatforms = ["facebook", "instagram", "whatsapp", "manual"];
    const normalizedPlatform = validPlatforms.includes(platform)
      ? platform
      : "manual";

    // Validate gender
    const validGenders = ["male", "female", "other"];
    const normalizedGender = validGenders.includes(gender) ? gender : "other";

    // Check if patient with same phone already exists (avoid duplicates)
    if (phone && typeof phone === "string" && phone.trim().length > 0) {
      const existing = await getPatients({
        search: phone.trim(),
        tenantId: Number(tenantId),
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

    // Generate patient ID
    const patientId = await generatePatientId();

    // Create the patient
    const newId = await createPatient({
      tenantId: Number(tenantId),
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
      },
    });
  } catch (error: any) {
    console.error("[PublicAPI] Error creating patient:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * GET /api/public/patients
 * Search for patients by name or phone.
 *
 * Query params:
 *   search   (optional) - Search term (name or phone)
 *   phone    (optional) - Exact phone search
 *   tenantId (optional) - Tenant ID (default: 1)
 *   limit    (optional) - Max results (default: 10, max: 50)
 */
async function searchPatientsHandler(req: Request, res: Response) {
  if (!authenticateApiKey(req, res)) return;

  try {
    const {
      search,
      phone,
      tenantId = 1,
      limit = 10,
    } = req.query;

    const searchTerm = (search as string) || (phone as string) || "";
    const limitNum = Math.min(Number(limit) || 10, 50);

    const result = await getPatients({
      search: searchTerm,
      tenantId: Number(tenantId),
      limit: limitNum,
      page: 1,
    });

    return res.status(200).json({
      success: true,
      total: result.total,
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
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * GET /api/public/health
 * Health check endpoint (no auth required)
 */
function healthHandler(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    service: "Clinic Management System - Public API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}

// ─── Register Routes ──────────────────────────────────────────────────────────
export function registerPublicApi(app: Express) {
  app.get("/api/public/health", healthHandler);
  app.post("/api/public/patients", createPatientHandler);
  app.get("/api/public/patients", searchPatientsHandler);

  console.log("[PublicAPI] Routes registered: POST/GET /api/public/patients");
}
