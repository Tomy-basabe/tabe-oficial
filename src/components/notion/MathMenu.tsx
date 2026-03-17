import React, { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Calculator } from "lucide-react";

// Categorized symbols
export const MATH_SYMBOLS = [
  {
    category: "Letras Griegas (Minúsculas)",
    symbols: [
      { label: "alpha", symbol: "α", latex: "\\alpha" },
      { label: "beta", symbol: "β", latex: "\\beta" },
      { label: "gamma", symbol: "γ", latex: "\\gamma" },
      { label: "delta", symbol: "δ", latex: "\\delta" },
      { label: "epsilon", symbol: "ε", latex: "\\epsilon" },
      { label: "zeta", symbol: "ζ", latex: "\\zeta" },
      { label: "eta", symbol: "η", latex: "\\eta" },
      { label: "theta", symbol: "θ", latex: "\\theta" },
      { label: "iota", symbol: "ι", latex: "\\iota" },
      { label: "kappa", symbol: "κ", latex: "\\kappa" },
      { label: "lambda", symbol: "λ", latex: "\\lambda" },
      { label: "mu", symbol: "μ", latex: "\\mu" },
      { label: "nu", symbol: "ν", latex: "\\nu" },
      { label: "xi", symbol: "ξ", latex: "\\xi" },
      { label: "pi", symbol: "π", latex: "\\pi" },
      { label: "rho", symbol: "ρ", latex: "\\rho" },
      { label: "sigma", symbol: "σ", latex: "\\sigma" },
      { label: "tau", symbol: "τ", latex: "\\tau" },
      { label: "phi", symbol: "φ", latex: "\\phi" },
      { label: "chi", symbol: "χ", latex: "\\chi" },
      { label: "psi", symbol: "ψ", latex: "\\psi" },
      { label: "omega", symbol: "ω", latex: "\\omega" },
    ],
  },
  {
    category: "Letras Griegas (Mayúsculas)",
    symbols: [
      { label: "Gamma", symbol: "Γ", latex: "\\Gamma" },
      { label: "Delta", symbol: "Δ", latex: "\\Delta" },
      { label: "Theta", symbol: "Θ", latex: "\\Theta" },
      { label: "Lambda", symbol: "Λ", latex: "\\Lambda" },
      { label: "Xi", symbol: "Ξ", latex: "\\Xi" },
      { label: "Pi", symbol: "Π", latex: "\\Pi" },
      { label: "Sigma", symbol: "Σ", latex: "\\Sigma" },
      { label: "Phi", symbol: "Φ", latex: "\\Phi" },
      { label: "Psi", symbol: "Ψ", latex: "\\Psi" },
      { label: "Omega", symbol: "Ω", latex: "\\Omega" },
    ],
  },
  {
    category: "Operadores y Relaciones",
    symbols: [
      { label: "suma (sumatoria)", symbol: "∑", latex: "\\sum" },
      { label: "integral", symbol: "∫", latex: "\\int" },
      { label: "producto", symbol: "∏", latex: "\\prod" },
      { label: "raíz", symbol: "√", latex: "\\sqrt{}" },
      { label: "infinito", symbol: "∞", latex: "\\infty" },
      { label: "diferente", symbol: "≠", latex: "\\neq" },
      { label: "aproximado", symbol: "≈", latex: "\\approx" },
      { label: "mayor o igual", symbol: "≥", latex: "\\geq" },
      { label: "menor o igual", symbol: "≤", latex: "\\leq" },
      { label: "más menos", symbol: "±", latex: "\\pm" },
      { label: "pertenece", symbol: "∈", latex: "\\in" },
      { label: "para todo", symbol: "∀", latex: "\\forall" },
      { label: "existe", symbol: "∃", latex: "\\exists" },
      { label: "gradiente (nabla)", symbol: "∇", latex: "\\nabla" },
      { label: "derivada parcial", symbol: "∂", latex: "\\partial" },
      { label: "flecha derecha", symbol: "→", latex: "\\rightarrow" },
    ],
  },
  {
    category: "Notaciones Comunes",
    symbols: [
      { label: "fracción", symbol: "x/y", latex: "\\frac{}{}" },
      { label: "exponente", symbol: "xⁿ", latex: "^{}" },
      { label: "subíndice", symbol: "xₙ", latex: "_{}" },
      { label: "límit", symbol: "lim", latex: "\\lim_{x \\to \\infty}" },
      { label: "seno", symbol: "sin", latex: "\\sin" },
      { label: "coseno", symbol: "cos", latex: "\\cos" },
    ],
  },
];

interface MathMenuProps {
  onSelect: (latex: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorEl?: DOMRect | null;
}

export function MathMenu({ onSelect, open, onOpenChange, anchorEl }: MathMenuProps) {
  const [search, setSearch] = useState("");

  const filteredSymbols = useMemo(() => {
    if (!search) return MATH_SYMBOLS;
    return MATH_SYMBOLS.map((category) => ({
      ...category,
      symbols: category.symbols.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.symbol.toLowerCase().includes(search.toLowerCase()) ||
          s.latex.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter((cat) => cat.symbols.length > 0);
  }, [search]);

  // If we have an anchorEl, we position the popover manually or let Radix handle it
  // In this case, we'll try to use a floating div if no specific anchor is provided via Radix
  
  return (
    <div 
      className={cn(
        "fixed z-[100] w-[320px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
        open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      )}
      style={{
        left: anchorEl ? `${anchorEl.left}px` : "50%",
        top: anchorEl ? `${anchorEl.bottom + 8}px` : "50%",
        transform: anchorEl ? "none" : "translate(-50%, -50%)",
      }}
    >
      <div className="p-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-1">
          Notación Matemática
        </span>
        <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground">
          ESC
        </kbd>
      </div>

      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar símbolo (ej: alfa, raíz...)"
            className="pl-8 h-9 text-sm focus-visible:ring-primary/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-[350px] overflow-y-auto p-1 custom-scrollbar">
        {filteredSymbols.length > 0 ? (
          filteredSymbols.map((category) => (
            <div key={category.category} className="mb-2">
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                {category.category}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {category.symbols.map((symbol) => (
                  <button
                    key={symbol.label}
                    title={symbol.label}
                    onClick={() => {
                        onSelect(symbol.latex);
                        onOpenChange(false);
                        setSearch("");
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all group"
                  >
                    <span className="text-lg font-serif mb-1 group-hover:scale-110 transition-transform">
                      {symbol.symbol}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center group-hover:text-primary/70">
                      {symbol.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No se encontraron símbolos
          </div>
        )}
      </div>
      
      <div className="p-2 border-t border-border bg-secondary/20 text-[10px] text-muted-foreground text-center italic">
        Escribe en LaTeX para fórmulas avanzadas
      </div>
    </div>
  );
}
