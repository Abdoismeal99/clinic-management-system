import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { tenants, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

// Use the VITE_APP_URL env if set, otherwise fall back to the known production domain
const APP_BASE_URL =
  process.env.VITE_APP_URL?.replace(/\/$/, "") ||
  "https://clinic-system.org";

const REDIRECT_URI = `${APP_BASE_URL}/api/auth/google/callback`;

export function registerGoogleOAuthRoutes(app: Express) {
  // Step 1: Redirect user to Google
  app.get("/api/auth/google", (req: Request, res: Response) => {
    // Support returnTo so activation links work after login
    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : null;
    const state = returnTo ? Buffer.from(JSON.stringify({ returnTo })).toString("base64") : undefined;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      ...(state ? { state } : {}),
    });
    console.log("[Google OAuth] Redirecting with redirect_uri:", REDIRECT_URI);
    res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  // Step 2: Handle Google callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;

    if (error || !code) {
      console.error("[Google OAuth] Error or missing code:", error);
      res.redirect(302, "/?error=auth_failed");
      return;
    }

    try {
      // Exchange code for tokens
      const tokenRes = await axios.post<{
        access_token: string;
        id_token: string;
        token_type: string;
      }>(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token } = tokenRes.data;

      // Get user info from Google
      const userInfoRes = await axios.get<{
        sub: string;
        name: string;
        email: string;
        picture: string;
      }>("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { sub, name, email } = userInfoRes.data;
      const openId = `google_${sub}`;

      // Upsert user in DB
      await db.upsertUser({
        openId,
        name: name || null,
        email: email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create session JWT (reuse existing SDK)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect back to returnTo if provided via state
      // Also auto-link user to tenant if returnTo contains an activation token
      let redirectTo = "/";
      let activationToken: string | null = null;
      try {
        const stateParam = typeof req.query.state === "string" ? req.query.state : null;
        if (stateParam) {
          const stateObj = JSON.parse(Buffer.from(stateParam, "base64").toString());
          if (stateObj.returnTo && typeof stateObj.returnTo === "string" && stateObj.returnTo.startsWith("/")) {
            redirectTo = stateObj.returnTo;
            // Extract activation token from returnTo URL
            const returnToUrl = new URL(stateObj.returnTo, "http://localhost");
            activationToken = returnToUrl.searchParams.get("token");
          }
        }
      } catch {}

      // If we have an activation token, auto-link this user to the tenant as clinic_admin
      if (activationToken) {
        try {
          const database = await getDb();
          if (database) {
            const tenantResult = await database.select().from(tenants)
              .where(eq(tenants.activationToken, activationToken))
              .limit(1);
            const tenant = tenantResult[0];
            if (tenant) {
              // Activate the tenant if pending
              if (tenant.status === "pending") {
                await database.update(tenants).set({ status: "active", activatedAt: new Date() })
                  .where(eq(tenants.id, tenant.id));
              }
              // Link user to tenant as clinic_admin (regardless of email)
              await database.update(users).set({ tenantId: tenant.id, tenantRole: "clinic_admin" })
                .where(eq(users.openId, openId));
              console.log(`[Google OAuth] Linked user ${email} to tenant ${tenant.clinicName} as clinic_admin`);
              // Redirect to dashboard after successful activation
              redirectTo = "/";
            }
          }
        } catch (linkErr: any) {
          console.error("[Google OAuth] Failed to link user to tenant:", linkErr?.message);
        }
      }

      res.redirect(302, redirectTo);
    } catch (err: any) {
      console.error("[Google OAuth] Callback failed:", err?.response?.data ?? err?.message ?? err);
      res.redirect(302, "/?error=auth_failed");
    }
  });
}
