import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API Key", () => {
  it("should be able to list domains (validates API key)", async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.domains.list();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data?.data)).toBe(true);
  });
});
