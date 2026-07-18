import { describe, it, expect } from "vitest";

describe("OpenRouter API Key", () => {
  it("should be able to call Gemini 2.5 Pro via OpenRouter", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    expect(apiKey, "OPENROUTER_API_KEY must be set").toBeTruthy();

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://clinic-system.org",
        "X-Title": "Clinic Management System",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: "قل مرحبا بكلمة واحدة" }],
        max_tokens: 20,
      }),
    });

    const body = await res.text();
    expect(res.ok, `OpenRouter returned ${res.status}: ${body}`).toBe(true);
    const data = JSON.parse(body) as any;
    expect(data.choices?.[0]?.message?.content).toBeTruthy();
    console.log("Gemini reply:", data.choices?.[0]?.message?.content);
  }, 30000);
});
