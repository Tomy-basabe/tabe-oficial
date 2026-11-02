import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Normaliza y traduce símbolos y patrones matemáticos crudos (Unicode, derivadas parciales, integrales, letras griegas)
 * hacia sintaxis LaTeX compatible con KaTeX.
 */
export function transformRawMath(str: string): string {
  if (!str) return "";
  return str
    .replace(/∭/g, "\\iiint ")
    .replace(/∬/g, "\\iint ")
    .replace(/∮/g, "\\oint ")
    .replace(/∫/g, "\\int ")
    .replace(/∂([A-Za-z0-9_]+)\s*\/\s*∂([A-Za-z0-9_]+)/g, "\\frac{\\partial $1}{\\partial $2}")
    .replace(/∂/g, "\\partial ")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/([a-zA-Z])([1-9])(?![0-9a-zA-Z])/g, "$1_$2") // g1(x) -> g_1(x), h2(y) -> h_2(y)
    .replace(/\bθ\b|θ/g, "\\theta ")
    .replace(/\bλ\b|λ/g, "\\lambda ")
    .replace(/\bπ\b|π/g, "\\pi ")
    .replace(/\bα\b|α/g, "\\alpha ")
    .replace(/\bβ\b|β/g, "\\beta ")
    .replace(/\bγ\b|γ/g, "\\gamma ")
    .replace(/\bσ\b|σ/g, "\\sigma ")
    .replace(/\bω\b|ω/g, "\\omega ")
    .replace(/\bΔ\b|Δ/g, "\\Delta ")
    .replace(/\bΩ\b|Ω/g, "\\Omega ")
    .replace(/\bμ\b|μ/g, "\\mu ")
    .replace(/\bρ\b|ρ/g, "\\rho ")
    .replace(/\bφ\b|φ/g, "\\phi ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\neq ")
    .replace(/±/g, "\\pm ")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/≈/g, "\\approx ")
    .replace(/∈/g, "\\in ")
    .replace(/∉/g, "\\notin ")
    .replace(/⊂/g, "\\subset ")
    .replace(/⊆/g, "\\subseteq ")
    .replace(/∪/g, "\\cup ")
    .replace(/∩/g, "\\cap ")
    .replace(/∞/g, "\\infty ")
    .replace(/→/g, "\\to ")
    .replace(/⇒/g, "\\implies ")
    .replace(/⇔/g, "\\iff ")
    .replace(/∑/g, "\\sum ")
    .replace(/∏/g, "\\prod ")
    .replace(/√/g, "\\sqrt ")
    .replace(/\bsen\b/g, "\\operatorname{sen}")
    .replace(/\bcos\b/g, "\\cos")
    .replace(/\btan\b/g, "\\tan")
    .replace(/\bln\b/g, "\\ln");
}

/**
 * Preprocesa un texto arbitrario (enunciados, opciones, explicaciones, apuntes o flashcards)
 * detectando fórmulas matemáticas completas o expresiones en línea y envolviéndolas en `$ ... $` o `$$ ... $$`
 */
export function preprocessMathText(text: string): string {
  if (!text) return "";
  let str = text;

  // Convertir \[ ... \] -> $$ ... $$ y \( ... \) -> $ ... $
  str = str.replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$");
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$");

  // Si el texto ya tiene delimitadores de LaTeX ($), normalizar únicamente el interior de la fórmula
  if (str.includes("$")) {
    return str.replace(/\$([^\$]+)\$/g, (_, inner) => "$" + transformRawMath(inner) + "$");
  }

  // Detectar si el texto completo es primordialmente una fórmula matemática (ej: opciones de examen A, B, C, D)
  const cleanTrim = str.trim();
  const startsWithIntegral = /^[A-D\d\.\)\s]*[∫∬∭∮]/.test(cleanTrim) || /^\\[i]?[i]?int/.test(cleanTrim);
  const words = cleanTrim.split(/\s+/).filter((w) => /^[a-záéíóúñA-ZÁÉÍÓÚÑ]{4,}$/.test(w));
  const mathTokens = (cleanTrim.match(/[∫∬∭∮=∂\^_²³\+\-\*\/\\]/g) || []).length;

  const isPureFormula = startsWithIntegral && (words.length <= 1 || mathTokens >= 3);

  if (isPureFormula) {
    return "$" + transformRawMath(cleanTrim) + "$";
  }

  // Texto mixto (preguntas con texto explicativo + fórmulas integradas):
  // 1. Teoremas y ecuaciones con integrales cerradas/superficie: ∮_C ... = ∬_R ... dA
  str = str.replace(/(∮_C\s*[^\n=\.,\?]+?\s*=\s*∬_R\s*[^\n\.,\?]+?\s*dA)/g, (m) => {
    return "$" + transformRawMath(m.trim()) + "$";
  });

  // 2. Integrales dobles/triples/simples en línea: ∬_R f(x,y) dx dy, ∭_W f(x,y,z) dV, ∫_{...}^{...}
  str = str.replace(
    /([∮∭∬∫](?:_[A-Za-z0-9_\{\}]+)?(?:\^[A-Za-z0-9_\{\}]+)?[\s\S]*?(?:dx\s*dy(?:\s*dz)?|dx|dy|dz|dr\s*dθ(?:\s*dz)?|d[xyzrtuvwθ]|dA|dV|ds))/g,
    (m) => {
      if (m.startsWith("$")) return m;
      return "$" + transformRawMath(m.trim()) + "$";
    }
  );

  // 3. Desigualdades de rangos de integración: a ≤ x ≤ b, g1(x) ≤ y ≤ g2(x)
  str = str.replace(
    /([a-zA-Z0-9_\(\)]+\s*[≤≥]\s*[a-zA-Z0-9_\(\)]+(?:\s*[≤≥]\s*[a-zA-Z0-9_\(\)]+)?)/g,
    (m) => {
      if (m.startsWith("$")) return m;
      return "$" + transformRawMath(m.trim()) + "$";
    }
  );

  // 4. Ecuaciones de volumen o diferenciales: dV = r dr dθ dz
  str = str.replace(/\b(dV|dA|ds)\s*=\s*([a-zA-Z0-9_\sθλπαβ²³\(\)\*\+\-\/]+)/g, (m) => {
    if (m.startsWith("$")) return m;
    return "$" + transformRawMath(m.trim()) + "$";
  });

  // 5. Expresiones de derivadas parciales: (∂Q/∂x - ∂P/∂y) o ∂P/∂x
  str = str.replace(
    /(\(?\s*∂[A-Za-z0-9_]+\s*\/\s*∂[A-Za-z0-9_]+(?:\s*[\+\-]\s*∂[A-Za-z0-9_]+\s*\/\s*∂[A-Za-z0-9_]+)?\s*\)?)/g,
    (m) => {
      if (m.startsWith("$")) return m;
      return "$" + transformRawMath(m.trim()) + "$";
    }
  );

  return str;
}

interface MathSegment {
  type: "text" | "math-inline" | "math-block";
  content?: string;
  html?: string;
}

interface MathTextProps {
  text: string;
  className?: string;
  as?: "span" | "p" | "div" | "h2" | "h3" | "h4";
}

/**
 * Componente universal de renderizado de texto matemático y científico.
 * Permite que integrales simples/dobles/triples/de línea, derivadas parciales,
 * letras griegas y fórmulas LaTeX se vean visualmente elegantes e impecables
 * tanto en Cuestionarios como en Flashcards, Apuntes y Juegos Académicos.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className, as: Component = "span" }) => {
  const segments = useMemo<MathSegment[]>(() => {
    if (!text) return [];

    const processed = preprocessMathText(text);
    if (!processed.includes("$")) {
      return [{ type: "text", content: processed }];
    }

    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
    const parts = processed.split(regex);

    return parts
      .filter((p) => p.length > 0)
      .map((part) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { throwOnError: false, displayMode: true });
            return { type: "math-block", html };
          } catch {
            return { type: "text", content: part };
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { throwOnError: false, displayMode: false });
            return { type: "math-inline", html };
          } catch {
            return { type: "text", content: part };
          }
        } else {
          return { type: "text", content: part };
        }
      });
  }, [text]);

  if (!text) return null;

  return (
    <Component className={cn("inline-block break-words", className)}>
      {segments.map((seg, idx) => {
        if (seg.type === "math-inline" && seg.html) {
          return (
            <span
              key={idx}
              className="inline-flex items-center align-middle mx-0.5 text-inherit"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }
        if (seg.type === "math-block" && seg.html) {
          return (
            <div
              key={idx}
              className="my-2 overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }
        return <span key={idx}>{seg.content}</span>;
      })}
    </Component>
  );
};
