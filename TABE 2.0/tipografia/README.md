# TABE — Character Banner

Proyecto web estático inspirado en el banner de TABE.

## Archivos

- `index.html` — estructura de la página.
- `styles.css` — diseño visual y responsive.
- `script.js` — genera las filas de caracteres y permite copiar cada carácter.
- `favicon.svg` — favicon sencillo del logo.

## Cómo usarlo

No necesita Node.js, npm ni servidor.

1. Descomprimí el ZIP.
2. Abrí `index.html` en Chrome, Edge o Firefox.
3. Hacé clic en cualquier carácter para copiarlo.

## Personalización

Los caracteres están definidos en `script.js`, dentro del array `rows`.
Podés agregar o quitar caracteres sin tocar el HTML.

Los colores principales están como variables CSS en `styles.css`:

- `--ink`
- `--orange`
- `--green`
- `--blue`
- `--yellow`

La tipografía usa Nunito desde Google Fonts. Si querés que funcione 100% offline, reemplazá el `@import` por una fuente local.
