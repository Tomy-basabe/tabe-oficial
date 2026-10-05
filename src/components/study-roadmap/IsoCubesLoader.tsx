import React, { useMemo } from "react";

/**
 * Loader isométrico de 27 cubos (3×3×3) que se reordenan en bucle.
 * Basado en el icono "geometric loading" de Reddit, reescrito en CSS puro generado por JS
 * (sin SASS) con la paleta cómic neobrutalista de TABE y bordes negros gruesos.
 */

interface IsoCubesLoaderProps {
  /** Escala visual (1 = 100%). */
  scale?: number;
  /** Duración del ciclo completo en segundos. */
  duration?: number;
  className?: string;
}

const KEYFRAME_STEPS: Array<{ pct: number; x: (w: number, l: number) => number; y: (h: number, w: number, l: number) => number }> = [
  { pct: 0, x: (w, l) => w * -50 - 50 + (l * 50 + 50), y: (h, w, l) => h * 50 - 200 + (w * 25 - 25) + (l * 25 + 25) },
  { pct: 14, x: (w, l) => w * -50 - 50 + (l * 100 - 50), y: (h, w, l) => h * 50 - 200 + (w * 25 - 25) + (l * 50 - 25) },
  { pct: 28, x: (w, l) => w * -100 + 50 + (l * 100 - 50), y: (h, w, l) => h * 50 - 200 + (w * 50 - 75) + (l * 50 - 25) },
  { pct: 43, x: (w, l) => w * -100 - 100 + (l * 100 + 100), y: (h, w, l) => h * 100 - 400 + (w * 50 - 50) + (l * 50 + 50) },
  { pct: 57, x: (w, l) => w * -100 - 100 + (l * 50 + 200), y: (h, w, l) => h * 100 - 400 + (w * 50 - 50) + (l * 25 + 100) },
  { pct: 71, x: (w, l) => w * -50 - 200 + (l * 50 + 200), y: (h, w, l) => h * 100 - 375 + (w * 25 - 25) + (l * 25 + 100) },
  { pct: 85, x: (w, l) => w * -50 - 50 + (l * 50 + 50), y: (h, w, l) => h * 50 - 200 + (w * 25 - 25) + (l * 25 + 25) },
  { pct: 100, x: (w, l) => w * -50 - 50 + (l * 50 + 50), y: (h, w, l) => h * 50 - 200 + (w * 25 - 25) + (l * 25 + 25) },
];

const INDEXES = [1, 2, 3];

function buildCss(duration: number): string {
  let css = `
.tabe-iso { position: relative; height: 100px; width: 86px; }
.tabe-iso .cube { position: absolute; width: 86px; height: 100px; animation-timing-function: ease; animation-iteration-count: infinite; animation-duration: ${duration}s; }
.tabe-iso .face { height: 50px; width: 50px; position: absolute; transform-origin: 0 0; box-shadow: inset 0 0 0 3px #0a0a0a; }
.tabe-iso .right { background: #FFE600; transform: rotate(-30deg) skewX(-30deg) translate(49px, 65px) scaleY(0.86); }
.tabe-iso .left { background: #FF3366; transform: rotate(90deg) skewX(-30deg) scaleY(0.86) translate(25px, -50px); }
.tabe-iso .top { background: #00E5FF; transform: rotate(210deg) skew(-30deg) translate(-75px, -22px) scaleY(0.86); z-index: 2; }
@media (prefers-reduced-motion: reduce) { .tabe-iso .cube { animation-duration: ${duration * 3}s; } }
`;
  for (const h of INDEXES) {
    for (const w of INDEXES) {
      for (const l of INDEXES) {
        css += `.tabe-iso .h${h}.w${w}.l${l} { z-index: ${-h}; animation-name: tiso-h${h}w${w}l${l}; }\n`;
        css += `@keyframes tiso-h${h}w${w}l${l} {\n`;
        for (const s of KEYFRAME_STEPS) {
          css += `  ${s.pct}% { transform: translate(${s.x(w, l)}%, ${s.y(h, w, l)}%); }\n`;
        }
        css += `}\n`;
      }
    }
  }
  return css;
}

const Cube: React.FC<{ h: number; w: number; l: number }> = ({ h, w, l }) => (
  <div className={`cube h${h} w${w} l${l}`}>
    <div className="face top" />
    <div className="face left" />
    <div className="face right" />
  </div>
);

export const IsoCubesLoader: React.FC<IsoCubesLoaderProps> = ({ scale = 0.6, duration = 3, className }) => {
  const css = useMemo(() => buildCss(duration), [duration]);
  const size = Math.round(360 * scale);

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative", margin: "0 auto" }}
      role="status"
      aria-label="Cargando"
    >
      <style>{css}</style>
      <div
        className="tabe-iso"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -43,
          marginTop: -50,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {INDEXES.flatMap((h) =>
          INDEXES.flatMap((w) => INDEXES.map((l) => <Cube key={`${h}${w}${l}`} h={h} w={w} l={l} />))
        )}
      </div>
    </div>
  );
};
