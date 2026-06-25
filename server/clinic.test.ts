import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(role: "admin" | "doctor" | "assistant" | "user" = "admin"): TrpcContext {
  return {
    user: { id: 1, openId: "test-user", email: "test@example.com", name: "Test User", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("dashboard.stats", () => {
  it("returns stats object with expected keys", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.dashboard.stats();
    expect(result).toHaveProperty("patientCount");
    expect(result).toHaveProperty("todayAppts");
    expect(result).toHaveProperty("recentPatients");
    expect(result).toHaveProperty("recentVisits");
    expect(result).toHaveProperty("followUps");
    expect(result).toHaveProperty("monthlyPatients");
    expect(result).toHaveProperty("monthlyVisits");
    expect(result).toHaveProperty("activities");
  });
});

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const ctx = makeCtx("doctor");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.role).toBe("doctor");
  });
});

describe("role-based access", () => {
  it("throws FORBIDDEN when assistant tries to create prescription", async () => {
    const caller = appRouter.createCaller(makeCtx("assistant"));
    await expect(caller.prescriptions.create({ patientId: 1, medications: [{ medicine: "Test", dose: "10mg", frequency: "daily", duration: "7 days", instructions: "" }] })).rejects.toThrow();
  });
});
