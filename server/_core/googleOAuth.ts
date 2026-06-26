import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

// Use the VITE_APP_URL env if set, otherwise fall back to the known production domain
const APP_BASE_URL =
  process.env.VITE_APP_URL?.replace(/\/$/, "") ||
  "https://clinic-system.org";

const REDIRECT_URI = `${APP_BASE_URL}/api/auth/google/callback`;

export function registerGoogleOAuthRoutes(app: Express) {
  // Step 1: Redirect user to Google
  app.get("/api/auth/google", (_req: Request, res: Response) => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
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
      res.redirect(302, "/");
    } catch (err: any) {
      console.error("[Google OAuth] Callback failed:", err?.response?.data ?? err?.message ?? err);
      res.redirect(302, "/?error=auth_failed");
    }
  });
}
