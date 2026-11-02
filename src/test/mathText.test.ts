import { describe, it, expect } from "vitest";
import katex from "katex";
import { preprocessMathText, transformRawMath } from "@/components/ui/MathText";

describe("MathText & Formula Preprocessor", () => {
  it("converts double integrals with bounds into valid KaTeX", () => {
    const raw = "∫_{y=c}^{d} ∫_{x=h1(y)}^{h2(y)} f(x,y) dx dy";
    const processed = preprocessMathText(raw);
    expect(processed.startsWith("$")).toBe(true);
    expect(processed.endsWith("$")).toBe(true);
    
    // Must render with KaTeX without throwing
    const math = processed.slice(1, -1);
    expect(() => katex.renderToString(math, { throwOnError: true })).not.toThrow();
  });

  it("converts triple integrals in cylindrical coordinates into valid KaTeX", () => {
    const raw = "∭ f(r cos θ, r sen θ, z) r dr dθ dz";
    const processed = preprocessMathText(raw);
    expect(processed).toContain("\\iiint");
    expect(processed).toContain("\\theta");
    expect(processed).toContain("\\operatorname{sen}");

    const math = processed.slice(1, -1);
    expect(() => katex.renderToString(math, { throwOnError: true })).not.toThrow();
  });

  it("converts line integrals and Green's Theorem partial derivatives", () => {
    const raw = "∮_C P dx + Q dy = ∬_R (∂Q/∂x - ∂P/∂y) dA";
    const processed = preprocessMathText(raw);
    expect(processed).toContain("\\oint");
    expect(processed).toContain("\\iint");
    expect(processed).toContain("\\frac{\\partial Q}{\\partial x}");
    expect(processed).toContain("\\frac{\\partial P}{\\partial y}");

    const math = processed.slice(1, -1);
    expect(() => katex.renderToString(math, { throwOnError: true })).not.toThrow();
  });

  it("handles mixed Spanish text with inline integrals and inequalities", () => {
    const raw = "Para calcular la integral doble ∬_R f(x,y) dx dy sobre una región R del tipo I (x-simple), ¿cuál es el orden correcto de los límites de integración?";
    const processed = preprocessMathText(raw);
    expect(processed).toContain("Para calcular la integral doble ");
    expect(processed).toContain("$\\iint _R f(x,y) dx dy$");
    expect(processed).toContain("sobre una región R");
  });

  it("handles inequalities and bounds in explanations", () => {
    const raw = "Una región x-simple (Tipo I) se describe como a ≤ x ≤ b, g1(x) ≤ y ≤ g2(x).";
    const processed = preprocessMathText(raw);
    expect(processed).toContain("$a \\le  x \\le  b$");
    expect(processed).toContain("$g_1(x) \\le  y \\le  g_2(x)$");
  });
});
