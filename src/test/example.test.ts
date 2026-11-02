import { describe, it, expect } from "vitest";
import { sanitizeHtml, validateFileUpload, validateFileSignature } from "@/lib/security";
import { isSuperAdmin } from "@/lib/adminAuth";

describe("Red Team Security Remediation Checks", () => {
  it("blocks DOM XSS via SVG, unquoted event handlers, and obfuscated javascript: URIs", () => {
    const payload = `
      <p>Texto seguro</p>
      <img src=x onerror=alert(1)>
      <svg onload="alert(2)"><script>alert(3)</script></svg>
      <a href="jav&#x0A;ascript:alert(4)">Click</a>
      <iframe src="https://evil.com"></iframe>
    `;
    const clean = sanitizeHtml(payload);
    expect(clean).toContain("<p>Texto seguro</p>");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<svg");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("javascript:");
  });

  it("rejects SVG uploads and dangerous extensions", () => {
    const svgFile = new File(["<svg onload=alert(1)>"], "exploit.svg", { type: "image/svg+xml" });
    expect(validateFileUpload(svgFile).valid).toBe(false);

    const pngFile = new File(["fake"], "photo.png", { type: "image/png" });
    expect(validateFileUpload(pngFile).valid).toBe(true);
  });

  it("verifies binary Magic Bytes via validateFileSignature", async () => {
    const fakePdf = new File(["<html><script>alert(1)</script></html>"], "fake.pdf", {
      type: "application/pdf",
    });
    const fakeResult = await validateFileSignature(fakePdf);
    expect(fakeResult.valid).toBe(false);

    const realPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const realPdf = new File([realPdfBytes], "apunte.pdf", { type: "application/pdf" });
    const realResult = await validateFileSignature(realPdf);
    expect(realResult.valid).toBe(true);
  });

  it("prevents privilege escalation via user_metadata in isSuperAdmin", () => {
    const forgedUser = {
      id: "00000000-0000-0000-0000-000000000000",
      email: "attacker@evil.com",
      user_metadata: {
        role: "admin",
        email: "admin@tabe.com",
      },
      app_metadata: {
        role: "user",
      },
    };
    expect(isSuperAdmin(forgedUser)).toBe(false);
  });
});
