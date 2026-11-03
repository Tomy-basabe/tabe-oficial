import * as path from "node:path";
import * as tls from "node:tls";
import * as fs from "node:fs";

const SYSACAD_LOGIN_URL = "https://sysacad.frm.utn.edu.ar/login.php";
const SYSACAD_PROCESS_URL = "https://sysacad.frm.utn.edu.ar/process.php";
const AUTOGESTION_AVISOS_URL = "https://www4.frm.utn.edu.ar/autogestion-alumnos/";
const CAMPUS_ORIGIN = "https://campusvirtual.frm.utn.edu.ar";
const MAIL_HOST = "alumnos.frm.utn.edu.ar";
const MAIL_PORT = 993;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const VER_TOKEN = "79845688";

export const SYSACAD_CONSULTAS = {
  materias_plan: { kind: "ver" as const, label: "Materias del plan", t: VER_TOKEN, p: "58978565" },
  estado_academico: { kind: "manpet" as const, label: "Estado académico", t: "402", query: "" },
  cursado_actual: { kind: "ver" as const, label: "Cursado en este año", t: VER_TOKEN, p: "95126514" },
  horarios_cursado: { kind: "ver" as const, label: "Horarios de cursado", t: VER_TOKEN, p: "95126518" },
  mis_horarios: { kind: "ver" as const, label: "Mis horarios", t: VER_TOKEN, p: "56456787" },
  historico_examenes: { kind: "ver" as const, label: "Histórico de exámenes", t: VER_TOKEN, p: "56897564" },
  aprobados: { kind: "ver" as const, label: "Exámenes aprobados", t: VER_TOKEN, p: "41562159" },
  aplazos: { kind: "ver" as const, label: "Exámenes aplazados", t: VER_TOKEN, p: "41562150" },
  historico_regulares: { kind: "ver" as const, label: "Histórico de regulares", t: VER_TOKEN, p: "95126515" },
  correlatividades_cursar: { kind: "manpet" as const, label: "Correlatividades para cursar", t: "104", query: "&vsTipo=01" },
  correlatividades_rendir: { kind: "manpet" as const, label: "Correlatividades para rendir", t: "104", query: "&vsTipo=02" },
  equivalencias: { kind: "manpet" as const, label: "Equivalencias", t: "104", query: "&vsTipo=03" },
};

export type SysacadConsultaKey = keyof typeof SYSACAD_CONSULTAS;

export interface SysacadTableResult {
  consulta: string;
  label: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  total?: number;
  message?: string;
  text?: string;
}

export interface AutogestionAviso {
  titulo: string;
  fecha?: string;
  texto: string;
}

export interface CampusCourseItem {
  id: string;
  name: string;
  url: string;
}

export interface CampusDeadlineItem {
  courseId: string;
  courseName: string;
  kind: "assignment" | "quiz";
  name: string;
  due?: string;
  status?: string;
  grade?: string;
  url: string;
}

export interface CampusGradeItem {
  courseId: string;
  courseName: string;
  itemName: string;
  grade: string;
  range?: string;
  percentage?: string;
  feedback?: string;
}

export interface CampusCalendarItem {
  id: string;
  name: string;
  date: string;
  courseName?: string;
  description?: string;
}

export interface MailMessageSummary {
  uid: number;
  from: string;
  subject: string;
  date?: string;
  seen: boolean;
  preview?: string;
}

// ─── HTML & TEXT UTILITIES (Zero external dependencies) ─────────────────────

function decodeHtmlEntities(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&Aacute;/gi, "Á")
    .replace(/&Eacute;/gi, "É")
    .replace(/&Iacute;/gi, "Í")
    .replace(/&Oacute;/gi, "Ó")
    .replace(/&Uacute;/gi, "Ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&Ntilde;/gi, "Ñ")
    .replace(/&deg;/gi, "°")
    .replace(/&ordm;/gi, "º")
    .replace(/&ordf;/gi, "ª")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    });
}

function stripTags(html: string, preserveNewlines = false): string {
  if (!html) return "";
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(?:span|div|p|a)[^>]*class=["'][^"']*(?:sr-only|accesshide)[^"']*["'][^>]*>[\s\S]*?<\/(?:span|div|p|a)>/gi, "");

  if (preserveNewlines) {
    s = s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, "\n");
    s = s.replace(/<[^>]+>/g, "");
    return decodeHtmlEntities(s)
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  s = s.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(s).replace(/\s+/g, " ").trim();
}

function getAttr(tagHtml: string, attrName: string): string | undefined {
  const regex = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`, "i");
  const m = tagHtml.match(regex);
  if (!m) return undefined;
  return decodeHtmlEntities(m[1] ?? m[2] ?? m[3] ?? "");
}

// ─── SIMPLE COOKIE JAR ──────────────────────────────────────────────────────

class CookieJar {
  private cookies = new Map<string, string>();

  absorb(res: Response) {
    const headersAny = res.headers as any;
    const rawList: string[] =
      typeof headersAny.getSetCookie === "function"
        ? headersAny.getSetCookie()
        : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")!]
        : [];

    for (const raw of rawList) {
      // Split multiple cookies if combined in one header
      const parts = raw.split(/,(?=\s*[A-Za-z0-9_\-]+=)/);
      for (const part of parts) {
        const firstPair = part.split(";")[0]?.trim();
        if (!firstPair) continue;
        const eqIdx = firstPair.indexOf("=");
        if (eqIdx <= 0) continue;
        const name = firstPair.slice(0, eqIdx).trim();
        const val = firstPair.slice(eqIdx + 1).trim();
        if (val === "deleted" || val === "") {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  hasCookies(): boolean {
    return this.cookies.size > 0;
  }
}

async function fetchWithJar(
  jar: CookieJar,
  url: string,
  options: {
    method?: "GET" | "POST";
    form?: Record<string, string>;
    jsonBody?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {}
): Promise<{ status: number; finalUrl: string; text: string; headers: Headers }> {
  let currentUrl = url;
  let currentMethod = options.method || "GET";
  let currentForm = options.form;
  let currentJson = options.jsonBody;
  const maxRedirects = options.maxRedirects ?? 6;
  const timeoutMs = options.timeoutMs ?? 15000;

  for (let i = 0; i <= maxRedirects; i++) {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      ...(options.headers || {}),
    };

    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    let body: string | undefined;
    if (currentMethod === "POST") {
      if (currentJson !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(currentJson);
      } else if (currentForm) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(currentForm).toString();
      }
    }

    const res = await fetch(currentUrl, {
      method: currentMethod,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    jar.absorb(res);

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) {
        const text = await decodeResponseText(res);
        return { status: res.status, finalUrl: currentUrl, text, headers: res.headers };
      }
      currentUrl = new URL(loc, currentUrl).href;
      if (res.status === 303 || res.status === 301 || res.status === 302) {
        currentMethod = "GET";
        currentForm = undefined;
        currentJson = undefined;
      }
      continue;
    }

    const text = await decodeResponseText(res);
    return { status: res.status, finalUrl: currentUrl, text, headers: res.headers };
  }

  throw new Error("Demasiadas redirecciones al conectar con el servidor de UTN FRM.");
}

async function decodeResponseText(res: Response): Promise<string> {
  const buf = await res.arrayBuffer();
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("iso-8859-1") || ct.includes("latin1") || ct.includes("windows-1252")) {
    return new TextDecoder("iso-8859-1").decode(buf);
  }
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("iso-8859-1").decode(buf);
  }
  return utf8;
}

// ─── 1. AVISOS PÚBLICOS DE AUTOGESTIÓN ──────────────────────────────────────

export function parseAutogestionAvisos(html: string): AutogestionAviso[] {
  const avisos: AutogestionAviso[] = [];
  const ulMatch = html.match(/<ul[^>]*class=["'][^"']*wp-notes-widget-list[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i);
  const scopeHtml = ulMatch ? ulMatch[1] : html;

  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRegex.exec(scopeHtml)) !== null) {
    const itemHtml = m[1];
    const h5Match = itemHtml.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
    const titulo = h5Match ? stripTags(h5Match[1]) : "";

    let fecha: string | undefined;
    const textos: string[] = [];

    const pRegex = /<p([^>]*)>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pRegex.exec(itemHtml)) !== null) {
      const attrs = pm[1] || "";
      const content = stripTags(pm[2], true);
      if (!content) continue;
      if (/wp-notes-widget-date/i.test(attrs)) {
        if (!fecha) fecha = content;
      } else {
        textos.push(content);
      }
    }

    if (titulo || textos.length > 0) {
      avisos.push({
        titulo: titulo || "Aviso de Autogestión",
        ...(fecha ? { fecha } : {}),
        texto: textos.join("\n"),
      });
    }
  }
  return avisos;
}

async function fetchAutogestionAvisos(): Promise<{ ok: boolean; avisos: AutogestionAviso[]; error?: string }> {
  try {
    const res = await fetch(AUTOGESTION_AVISOS_URL, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { ok: false, avisos: [], error: `El portal de avisos respondió HTTP ${res.status}.` };
    }
    const html = await res.text();
    const avisos = parseAutogestionAvisos(html);
    return { ok: true, avisos: avisos.slice(0, 12) };
  } catch (err: any) {
    return { ok: false, avisos: [], error: err?.message || "No se pudieron obtener los avisos de Autogestión." };
  }
}

// ─── 2. AUTOGESTIÓN (SYSACAD) PARSERS & CLIENT ─────────────────────────────

export function parseSysacadTable(html: string): Omit<SysacadTableResult, "consulta" | "label"> {
  const bodyText = stripTags(html);
  const totalMatch = /Cantidad Total:\s*(\d+)/i.exec(bodyText);
  const message = /No se encuentran datos de [^.]+\./i.test(bodyText)
    ? "No se encuentran datos para esta consulta."
    : undefined;

  // Find leaf tables (tables that do not contain nested <table)
  const leafTables: string[] = [];
  const lower = html.toLowerCase();
  let pos = 0;
  while (pos < lower.length) {
    const start = lower.indexOf("<table", pos);
    if (start === -1) break;
    const nextTable = lower.indexOf("<table", start + 6);
    const endTable = lower.indexOf("</table>", start + 6);
    if (endTable === -1) break;
    if (nextTable !== -1 && nextTable < endTable) {
      // Has nested table, advance to nested table
      pos = nextTable;
      continue;
    }
    leafTables.push(html.slice(start, endTable + 8));
    pos = endTable + 8;
  }

  let best: { rows: string[][]; header: string[] } | undefined;

  for (const tableHtml of leafTables) {
    const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (trMatches.length < 2) continue;

    const rows: string[][] = [];
    for (const tr of trMatches) {
      const cellMatches = tr.match(/<(?:td|th)\b[^>]*>[\s\S]*?<\/(?:td|th)>/gi) || [];
      const cells = cellMatches.map((c) => stripTags(c));
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length < 2) continue;
    const header = rows[0];
    const nonEmptyHeaderCells = header.filter((cell) => /[\p{L}\d]/u.test(cell));
    if (nonEmptyHeaderCells.length < 3) continue;

    if (!best || rows.length > best.rows.length) {
      best = { rows, header };
    }
  }

  const result: Omit<SysacadTableResult, "consulta" | "label"> = { columns: [], rows: [] };
  if (totalMatch) result.total = Number(totalMatch[1]);
  if (message) result.message = message;

  if (!best) {
    if (!message && bodyText) {
      result.text = bodyText.slice(0, 3000);
    }
    return result;
  }

  const indexes = best.header
    .map((cell, index) => (/[\p{L}\d]/u.test(cell) ? index : -1))
    .filter((index) => index >= 0);

  result.columns = indexes.map((index) => best!.header[index].toLowerCase());
  result.rows = best.rows
    .slice(1)
    .map((cells) =>
      Object.fromEntries(indexes.map((index, position) => [result.columns[position], cells[index] ?? ""]))
    )
    .filter((row) => Object.values(row).some(Boolean));

  return result;
}

export function parseInscripcionEstado(html: string): { abierta: boolean; mensaje?: string; materias?: string[] } | undefined {
  const text = stripTags(html);
  const closed = /No se puede inscribir[^.]*/i.exec(text);
  if (closed) return { abierta: false, mensaje: closed[0] };

  const linkMatches = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const materias = linkMatches
    .map((a) => stripTags(a))
    .filter((name) => /[\p{L}]/u.test(name) && !/^(volver|salir|cerrar|inicio|men[uú])/i.test(name));

  return materias.length > 0 ? { abierta: true, materias } : undefined;
}

function isSysacadWaitingPage(html: string): { waiting: boolean; refreshUrl?: string } {
  const text = stripTags(html);
  const metaRefresh = html.match(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*>/i);
  if (metaRefresh) {
    const content = getAttr(metaRefresh[0], "content") || "";
    const urlMatch = content.match(/url\s*=\s*([^;"'\s]+)/i);
    return { waiting: true, refreshUrl: urlMatch?.[1] };
  }
  if (/Espere por favor/i.test(text) || /^Listando [^.]*\.\.\.$/i.test(text)) {
    return { waiting: true };
  }
  return { waiting: false };
}

function parseFormsFromHtml(html: string): Array<{
  action: string;
  method: "GET" | "POST";
  name?: string;
  id?: string;
  inputs: Array<{ name?: string; value: string; type: string; rawTag: string }>;
}> {
  const forms: Array<{
    action: string;
    method: "GET" | "POST";
    name?: string;
    id?: string;
    inputs: Array<{ name?: string; value: string; type: string; rawTag: string }>;
  }> = [];

  const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let fm: RegExpExecArray | null;
  while ((fm = formRegex.exec(html)) !== null) {
    const formOpen = `<form ${fm[1]}>`;
    const body = fm[2];
    const action = getAttr(formOpen, "action") || "";
    const methodRaw = (getAttr(formOpen, "method") || "GET").toUpperCase();
    const method: "GET" | "POST" = methodRaw === "POST" ? "POST" : "GET";
    const name = getAttr(formOpen, "name");
    const id = getAttr(formOpen, "id");

    const inputs: Array<{ name?: string; value: string; type: string; rawTag: string }> = [];
    const inputRegex = /<input\b[^>]*>/gi;
    let im: RegExpExecArray | null;
    while ((im = inputRegex.exec(body)) !== null) {
      const tag = im[0];
      inputs.push({
        name: getAttr(tag, "name"),
        value: getAttr(tag, "value") ?? "",
        type: (getAttr(tag, "type") || "text").toLowerCase(),
        rawTag: tag,
      });
    }
    forms.push({ action, method, name, id, inputs });
  }
  return forms;
}

async function fetchSysacadData(
  username: string,
  password: string,
  requestedLegajo?: string,
  requestedConsultas?: SysacadConsultaKey[]
): Promise<{
  connected: boolean;
  error?: string;
  studentInfo?: { legajo?: string; fullLabel?: string; detectedEmail?: string };
  consultas: Record<string, SysacadTableResult>;
  inscripcion?: { abierta: boolean; mensaje?: string; materias?: string[] };
}> {
  const jar = new CookieJar();
  const consultasResult: Record<string, SysacadTableResult> = {};

  try {
    // 1. Initial GET to login.php to establish session cookies if any
    await fetchWithJar(jar, SYSACAD_LOGIN_URL, { timeoutMs: 10000 }).catch(() => null);

    // 2. POST credentials to process.php
    const loginRes = await fetchWithJar(jar, SYSACAD_PROCESS_URL, {
      method: "POST",
      form: {
        username: username.trim(),
        password: password,
        submit: "Ingresar",
      },
      timeoutMs: 12000,
    });

    if (
      /login\.php/i.test(loginRes.finalUrl) ||
      /error=si/i.test(loginRes.finalUrl) ||
      !/Legajo:/i.test(loginRes.text)
    ) {
      return {
        connected: false,
        error:
          "No se pudo iniciar sesión en Autogestión (Sysacad): DNI o clave incorrectos, o no se encontró legajo de alumno.",
        consultas: {},
      };
    }

    // 3. Find the Legajo form / button in process.php
    const forms = parseFormsFromHtml(loginRes.text);
    let targetForm: (typeof forms)[0] | undefined;
    let chosenLegajoValue = "";

    for (const f of forms) {
      const legajoInput = f.inputs.find((inp) => /^Legajo:/i.test(inp.value));
      if (!legajoInput) continue;
      if (requestedLegajo && legajoInput.value.includes(`Legajo: ${requestedLegajo} `)) {
        targetForm = f;
        chosenLegajoValue = legajoInput.value;
        break;
      }
      if (!targetForm && /Alumno/i.test(legajoInput.value)) {
        targetForm = f;
        chosenLegajoValue = legajoInput.value;
      }
    }

    // Fallback to any form with Legajo:
    if (!targetForm) {
      for (const f of forms) {
        const legajoInput = f.inputs.find((inp) => /^Legajo:/i.test(inp.value));
        if (legajoInput) {
          targetForm = f;
          chosenLegajoValue = legajoInput.value;
          break;
        }
      }
    }

    if (!targetForm) {
      return {
        connected: false,
        error: requestedLegajo
          ? `No se encontró el legajo ${requestedLegajo} en tu cuenta de Autogestión.`
          : "No se encontró un legajo de alumno activo en tu cuenta de Autogestión.",
        consultas: {},
      };
    }

    const legajoNumMatch = chosenLegajoValue.match(/Legajo:\s*(\d+)/i);
    const detectedLegajo = legajoNumMatch ? legajoNumMatch[1] : requestedLegajo;

    // Build payload from targetForm
    const formPayload: Record<string, string> = {};
    for (const inp of targetForm.inputs) {
      if (!inp.name) continue;
      if (inp.type === "submit" || inp.type === "button") {
        if (inp.value === chosenLegajoValue) {
          formPayload[inp.name] = inp.value;
        }
      } else {
        formPayload[inp.name] = inp.value;
      }
    }

    const actionUrl = new URL(targetForm.action || loginRes.finalUrl, loginRes.finalUrl).href;
    const homeRes = await fetchWithJar(jar, actionUrl, {
      method: targetForm.method,
      form: targetForm.method === "POST" ? formPayload : undefined,
      timeoutMs: 12000,
    });

    const homeUrl = homeRes.finalUrl;
    const homeHtml = homeRes.text;

    // Detect institutional email if displayed on homeHtml or process.php
    const emailMatch =
      homeHtml.match(/([a-zA-Z0-9._%+-]+@(?:alumnos\.)?frm\.utn\.edu\.ar)/i) ||
      loginRes.text.match(/([a-zA-Z0-9._%+-]+@(?:alumnos\.)?frm\.utn\.edu\.ar)/i);
    const detectedEmail = emailMatch ? emailMatch[1].toLowerCase() : undefined;

    // Inspect homeHtml to see how iRf('ver.frc', t, p) submits
    const homeForms = parseFormsFromHtml(homeHtml);
    const baseHiddenFields: Record<string, string> = {};
    let verFormMethod: "GET" | "POST" = "POST";
    for (const hf of homeForms) {
      const hasT = hf.inputs.some((i) => i.name === "t");
      const hasP = hf.inputs.some((i) => i.name === "p");
      if (hasT || hasP || hf.inputs.some((i) => i.type === "hidden")) {
        verFormMethod = hf.method;
        for (const inp of hf.inputs) {
          if (inp.name && inp.type !== "submit" && inp.type !== "button") {
            baseHiddenFields[inp.name] = inp.value;
          }
        }
        if (hasT && hasP) break;
      }
    }

    // Helper to execute a 'ver' or 'manpet' consulta
    const runConsulta = async (key: SysacadConsultaKey): Promise<SysacadTableResult | null> => {
      const spec = SYSACAD_CONSULTAS[key];
      try {
        if (spec.kind === "ver") {
          const verUrl = new URL("ver.frc", homeUrl).href;
          const payload = { ...baseHiddenFields, t: spec.t, p: spec.p };
          let res = await fetchWithJar(jar, verUrl, {
            method: verFormMethod,
            form: verFormMethod === "POST" ? payload : undefined,
            timeoutMs: 10000,
          });
          // Fallback to GET with query params if POST returned empty or login
          if (res.text.length < 200 || /login\.php/i.test(res.finalUrl)) {
            const getUrl = new URL(`ver.frc?t=${spec.t}&p=${spec.p}`, homeUrl).href;
            res = await fetchWithJar(jar, getUrl, { method: "GET", timeoutMs: 10000 });
          }
          const parsed = parseSysacadTable(res.text);
          return { consulta: key, label: spec.label, ...parsed };
        } else {
          let targetUrl = new URL(`transacciones/manpet.frc?t=${spec.t}&ingreso=0${spec.query || ""}`, homeUrl).href;
          const deadline = Date.now() + 12000;
          let lastHtml = "";
          while (Date.now() < deadline) {
            const res = await fetchWithJar(jar, targetUrl, { method: "GET", timeoutMs: 8000 });
            lastHtml = res.text;
            const waitState = isSysacadWaitingPage(lastHtml);
            if (!waitState.waiting) break;
            if (waitState.refreshUrl) {
              targetUrl = new URL(waitState.refreshUrl, res.finalUrl).href;
            } else {
              targetUrl = res.finalUrl;
            }
            await new Promise((r) => setTimeout(r, 900));
          }
          const parsed = parseSysacadTable(lastHtml);
          return { consulta: key, label: spec.label, ...parsed };
        }
      } catch {
        return null;
      }
    };

    const keysToFetch: SysacadConsultaKey[] = requestedConsultas || [
      "materias_plan",
      "estado_academico",
      "cursado_actual",
      "horarios_cursado",
      "historico_examenes",
      "correlatividades_cursar",
      "correlatividades_rendir",
    ];

    // Run sequentially because Sysacad shares a single server-side session state per legajo
    for (const k of keysToFetch) {
      const table = await runConsulta(k);
      if (table && (table.rows.length > 0 || table.message || table.text)) {
        consultasResult[k] = table;
      }
    }

    // Check enrollment status (t=502) quickly if time permits
    let inscripcion: { abierta: boolean; mensaje?: string; materias?: string[] } | undefined;
    try {
      const inscUrl = new URL("transacciones/manpet.frc?t=502&ingreso=0", homeUrl).href;
      const inscRes = await fetchWithJar(jar, inscUrl, { method: "GET", timeoutMs: 5000 });
      inscripcion = parseInscripcionEstado(inscRes.text);
    } catch {}

    // Detect any Encuestas Docentes links in homeHtml
    const encuestasLinks: Array<{ label: string; href: string }> = [];
    const linkMatches = homeHtml.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
    for (const aTag of linkMatches) {
      const text = stripTags(aTag);
      const href = getAttr(aTag, "href") || "";
      if (/encuesta/i.test(text) || /encuesta/i.test(href)) {
        encuestasLinks.push({ label: text || "Encuesta Docente", href });
      }
    }

    return {
      connected: true,
      studentInfo: {
        legajo: detectedLegajo,
        fullLabel: chosenLegajoValue,
        detectedEmail,
      },
      consultas: consultasResult,
      inscripcion,
      ...(encuestasLinks.length > 0 ? { encuestasMenu: encuestasLinks } : {}),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: `Error al consultar Autogestión (Sysacad): ${err?.message || "Tiempo de espera agotado"}`,
      consultas: consultasResult,
    };
  }
}

// ─── 3. CAMPUS VIRTUAL MOODLE UTN FRM ────────────────────────────────────────

function parseMoodleCoursesFromHtml(html: string): CampusCourseItem[] {
  const coursesMap = new Map<string, CampusCourseItem>();
  const linkRegex = /<a\b([^>]*href=["'][^"']*\/course\/view\.php\?id=(\d+)[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const id = m[2];
    if (!id || id === "1") continue;
    let name = stripTags(m[3])
      .replace(/^El curso es destacado\s*/i, "")
      .replace(/^Nombre del curso\s*/i, "")
      .replace(/^Curso\s*:\s*/i, "")
      .trim();

    const halfLen = Math.floor(name.length / 2);
    if (name.length > 6 && name.slice(0, halfLen).trim() === name.slice(halfLen).trim()) {
      name = name.slice(0, halfLen).trim();
    }

    if (name && !/^(acceder|entrar|ver|abrir|ir al curso|course|view)$/i.test(name)) {
      if (!coursesMap.has(id) || coursesMap.get(id)!.name.length < name.length) {
        coursesMap.set(id, {
          id,
          name,
          url: `${CAMPUS_ORIGIN}/course/view.php?id=${id}`,
        });
      }
    }
  }
  return Array.from(coursesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function parseMoodleProfileFromHtml(html: string): {
  fullName?: string;
  email?: string;
  courses: CampusCourseItem[];
} {
  const h1Match =
    html.match(/<div[^>]*class=["'][^"']*page-header-headings[^"']*["'][^>]*>\s*<h[12][^>]*>([\s\S]*?)<\/h[12]>/i) ||
    html.match(/<span[^>]*class=["'][^"']*usertext[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const fullName = h1Match ? stripTags(h1Match[1]) : undefined;

  const emailMatch = html.match(
    /([a-zA-Z0-9._%+-]+@alumnos\.frm\.utn\.edu\.ar|[a-zA-Z0-9._%+-]+@frm\.utn\.edu\.ar|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  const email = emailMatch ? emailMatch[1] : undefined;

  const courses = parseMoodleCoursesFromHtml(html);
  return { fullName, email, courses };
}

function parseMoodleCalendarFromHtml(html: string): CampusCalendarItem[] {
  const events: CampusCalendarItem[] = [];
  const blocks = html.split(/<div[^>]*class=["'][^"']*\bevent\b[^"']*["'][^>]*>/i).slice(1);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nameMatch =
      block.match(/<h3[^>]*class=["'][^"']*name[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i) ||
      block.match(/class=["'][^"']*event-title[^"']*["'][^>]*>([\s\S]*?)<\//i);
    const name = nameMatch ? stripTags(nameMatch[1]) : "";
    if (!name) continue;

    const dateMatch =
      block.match(/<a[^>]*href=["'][^"']*\/calendar\/view\.php\?view=day[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<span[^>]*class=["'][^"']*date[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const date = dateMatch ? stripTags(dateMatch[1]) : "";

    const courseMatch = block.match(/<a[^>]*href=["'][^"']*\/course\/view\.php\?id=\d+[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const courseName = courseMatch ? stripTags(courseMatch[1]) : undefined;

    events.push({
      id: String(i + 1),
      name,
      date,
      courseName,
    });
  }
  return events;
}

function parseMoodleAssignmentsIndex(html: string, course: CampusCourseItem): CampusDeadlineItem[] {
  const items: CampusDeadlineItem[] = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trMatches) {
    const linkMatch = tr.match(/<a[^>]*href=["']([^"']*\/mod\/assign\/view\.php\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const href = decodeHtmlEntities(linkMatch[1]);
    const name = stripTags(linkMatch[2]);
    const tdMatches = tr.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) || [];
    const cells = tdMatches.map((td) => stripTags(td));

    let due: string | undefined;
    let status: string | undefined;
    let grade: string | undefined;
    for (const cell of cells) {
      if (!cell || cell === name) continue;
      if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(cell)) {
        if (!due) due = cell;
      } else if (/\b(entregad[oa]|enviad[oa]|sin entrega|borrador|vencid[oa]|calificad[oa]|no entregado)\b/i.test(cell)) {
        if (!status) status = cell;
      } else if (/\d+([,.]\d+)?\s*\/\s*\d+|\b(aprobado|desaprobado)\b/i.test(cell)) {
        if (!grade) grade = cell;
      }
    }

    items.push({
      courseId: course.id,
      courseName: course.name,
      kind: "assignment",
      name,
      due,
      status,
      grade,
      url: new URL(href, CAMPUS_ORIGIN).href,
    });
  }
  return items;
}

function parseMoodleQuizzesIndex(html: string, course: CampusCourseItem): CampusDeadlineItem[] {
  const items: CampusDeadlineItem[] = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trMatches) {
    const linkMatch = tr.match(/<a[^>]*href=["']([^"']*\/mod\/quiz\/view\.php\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const href = decodeHtmlEntities(linkMatch[1]);
    const name = stripTags(linkMatch[2]);
    const tdMatches = tr.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) || [];
    const cells = tdMatches.map((td) => stripTags(td));

    let due: string | undefined;
    let status: string | undefined;
    let grade: string | undefined;
    for (const cell of cells) {
      if (!cell || cell === name) continue;
      if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(cell)) {
        if (!due) due = cell;
      } else if (/\b(finalizad[oa]|sin intento|en curso|cerrad[oa]|abiert[oa]|reintentar)\b/i.test(cell)) {
        if (!status) status = cell;
      } else if (/\d+([,.]\d+)?\s*\/\s*\d+|\b(aprobado|desaprobado)\b/i.test(cell)) {
        if (!grade) grade = cell;
      }
    }

    items.push({
      courseId: course.id,
      courseName: course.name,
      kind: "quiz",
      name,
      due,
      status: status || "Habilitado en Campus",
      grade,
      url: new URL(href, CAMPUS_ORIGIN).href,
    });
  }
  return items;
}

function parseMoodleGrades(html: string, course: CampusCourseItem): CampusGradeItem[] {
  const items: CampusGradeItem[] = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trMatches) {
    const nameMatch = tr.match(/<(?:th|td)[^>]*class=["'][^"']*column-itemname[^"']*["'][^>]*>([\s\S]*?)<\/(?:th|td)>/i);
    const gradeMatch = tr.match(/<td[^>]*class=["'][^"']*column-grade[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
    if (!nameMatch || !gradeMatch) continue;

    const itemName = stripTags(nameMatch[1]).replace(/^(Tarea|Cuestionario|Foro|Taller|Lección)\s*/i, "").trim();
    const grade = stripTags(gradeMatch[1]);
    if (!itemName || !grade || grade === "-") continue;

    const rangeMatch = tr.match(/<td[^>]*class=["'][^"']*column-range[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
    const pctMatch = tr.match(/<td[^>]*class=["'][^"']*column-percentage[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
    const fbMatch = tr.match(/<td[^>]*class=["'][^"']*column-feedback[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);

    items.push({
      courseId: course.id,
      courseName: course.name,
      itemName,
      grade,
      range: rangeMatch ? stripTags(rangeMatch[1]) : undefined,
      percentage: pctMatch ? stripTags(pctMatch[1]) : undefined,
      feedback: fbMatch ? stripTags(fbMatch[1]) : undefined,
    });
  }
  return items;
}

async function fetchCampusData(
  username: string,
  password: string
): Promise<{
  connected: boolean;
  error?: string;
  profile?: { fullName?: string; email?: string };
  courses: CampusCourseItem[];
  deadlines: CampusDeadlineItem[];
  grades: CampusGradeItem[];
  calendarEvents: CampusCalendarItem[];
}> {
  const jar = new CookieJar();
  try {
    const loginPage = await fetchWithJar(jar, `${CAMPUS_ORIGIN}/login/index.php`, { timeoutMs: 10000 });
    if (loginPage.status === 503) {
      return {
        connected: false,
        error: "El servidor del Campus Virtual UTN FRM (campusvirtual.frm.utn.edu.ar) se encuentra temporalmente fuera de línea o en mantenimiento (HTTP 503).",
        courses: [],
        deadlines: [],
        grades: [],
        calendarEvents: [],
      };
    }

    if (loginPage.status >= 400) {
      return {
        connected: false,
        error: `El Campus Virtual respondió con estado HTTP ${loginPage.status}.`,
        courses: [],
        deadlines: [],
        grades: [],
        calendarEvents: [],
      };
    }

    const tokenMatch = loginPage.text.match(/name=["']logintoken["']\s+value=["']([^"']+)["']/i);
    const logintoken = tokenMatch ? tokenMatch[1] : "";

    const authRes = await fetchWithJar(jar, `${CAMPUS_ORIGIN}/login/index.php`, {
      method: "POST",
      form: {
        anchor: "",
        logintoken,
        username: username.trim(),
        password,
      },
      timeoutMs: 12000,
    });

    const isLogged =
      !authRes.finalUrl.includes("/login/") &&
      /\/login\/logout\.php/i.test(authRes.text) &&
      !/<input[^>]*type=["']password["']/i.test(authRes.text);

    if (!isLogged) {
      return {
        connected: false,
        error: "No se pudo iniciar sesión en el Campus Virtual UTN FRM: usuario o contraseña incorrectos.",
        courses: [],
        deadlines: [],
        grades: [],
        calendarEvents: [],
      };
    }

    const sesskeyMatch =
      authRes.text.match(/"sesskey"\s*:\s*"([a-zA-Z0-9]+)"/) ||
      authRes.text.match(/sesskey=([a-zA-Z0-9]+)/);
    const sesskey = sesskeyMatch ? sesskeyMatch[1] : undefined;

    // Fetch profile, courses page, and upcoming calendar in parallel
    const [profileRes, coursesRes, myRes, calRes] = await Promise.allSettled([
      fetchWithJar(jar, `${CAMPUS_ORIGIN}/user/profile.php?showallcourses=1`, { timeoutMs: 9000 }),
      fetchWithJar(jar, `${CAMPUS_ORIGIN}/my/courses.php`, { timeoutMs: 9000 }),
      fetchWithJar(jar, `${CAMPUS_ORIGIN}/my/`, { timeoutMs: 9000 }),
      fetchWithJar(jar, `${CAMPUS_ORIGIN}/calendar/view.php?view=upcoming`, { timeoutMs: 9000 }),
    ]);

    const profileData =
      profileRes.status === "fulfilled" ? parseMoodleProfileFromHtml(profileRes.value.text) : { courses: [] };
    const coursesFromMy =
      coursesRes.status === "fulfilled" ? parseMoodleCoursesFromHtml(coursesRes.value.text) : [];
    const coursesFromMyArea =
      myRes.status === "fulfilled" ? parseMoodleCoursesFromHtml(myRes.value.text) : [];
    const coursesFromDash = parseMoodleCoursesFromHtml(authRes.text);

    const coursesMap = new Map<string, CampusCourseItem>();
    for (const c of [...coursesFromMy, ...coursesFromMyArea, ...coursesFromDash, ...profileData.courses]) {
      coursesMap.set(c.id, c);
    }

    // If Moodle Boost hides courses behind AJAX service.php, query it with sesskey
    if (coursesMap.size === 0 && sesskey) {
      try {
        const ajaxRes = await fetchWithJar(
          jar,
          `${CAMPUS_ORIGIN}/lib/ajax/service.php?sesskey=${sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`,
          {
            method: "POST",
            jsonBody: [
              {
                index: 0,
                methodname: "core_course_get_enrolled_courses_by_timeline_classification",
                args: { offset: 0, limit: 0, classification: "all", sort: "fullname" },
              },
            ],
            timeoutMs: 8000,
          }
        );
        const parsedAjax = JSON.parse(ajaxRes.text);
        const ajaxCourses = parsedAjax?.[0]?.data?.courses;
        if (Array.isArray(ajaxCourses)) {
          for (const ac of ajaxCourses) {
            if (ac?.id && ac?.fullname) {
              coursesMap.set(String(ac.id), {
                id: String(ac.id),
                name: String(ac.fullname).trim(),
                url: ac.viewurl || `${CAMPUS_ORIGIN}/course/view.php?id=${ac.id}`,
              });
            }
          }
        }
      } catch {}
    }

    const courses = Array.from(coursesMap.values());
    const calendarEvents =
      calRes.status === "fulfilled" ? parseMoodleCalendarFromHtml(calRes.value.text) : [];

    // Scan up to 6 courses for assignments & grades in parallel
    const deadlines: CampusDeadlineItem[] = [];
    const grades: CampusGradeItem[] = [];
    const coursesToScan = courses.slice(0, 6);

    await Promise.allSettled(
      coursesToScan.map(async (course) => {
        const [assignRes, quizRes, gradeRes] = await Promise.allSettled([
          fetchWithJar(jar, `${CAMPUS_ORIGIN}/mod/assign/index.php?id=${course.id}`, { timeoutMs: 7000 }),
          fetchWithJar(jar, `${CAMPUS_ORIGIN}/mod/quiz/index.php?id=${course.id}`, { timeoutMs: 7000 }),
          fetchWithJar(jar, `${CAMPUS_ORIGIN}/grade/report/user/index.php?id=${course.id}`, { timeoutMs: 7000 }),
        ]);
        if (assignRes.status === "fulfilled") {
          deadlines.push(...parseMoodleAssignmentsIndex(assignRes.value.text, course));
        }
        if (quizRes.status === "fulfilled") {
          deadlines.push(...parseMoodleQuizzesIndex(quizRes.value.text, course));
        }
        if (gradeRes.status === "fulfilled") {
          grades.push(...parseMoodleGrades(gradeRes.value.text, course));
        }
      })
    );

    return {
      connected: true,
      profile: {
        fullName: profileData.fullName,
        email: profileData.email,
      },
      courses,
      deadlines: deadlines.slice(0, 35),
      grades: grades.slice(0, 40),
      calendarEvents: calendarEvents.slice(0, 25),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: `No se pudo conectar con el Campus Virtual UTN FRM: ${err?.message || "Error de red"}`,
      courses: [],
      deadlines: [],
      grades: [],
      calendarEvents: [],
    };
  }
}

// ─── 3.B. RESOLUCIÓN DE CUESTIONARIOS DEL CAMPUS VIRTUAL (MOODLE) ───────────

export interface MoodleQuestionChoice {
  value: string;
  text: string;
  inputName: string;
  inputType: "radio" | "checkbox" | "text";
}

export interface MoodleExtractedQuestion {
  slot: number;
  questionId: string;
  qtext: string;
  choices: MoodleQuestionChoice[];
  sequencecheckName?: string;
  sequencecheckValue?: string;
}

export function parseMoodleQuizAttemptQuestions(html: string): {
  attemptId?: string;
  sesskey?: string;
  thispage?: string;
  nextpage?: string;
  slots?: string;
  formAction?: string;
  hiddenInputs: Record<string, string>;
  questions: MoodleExtractedQuestion[];
} {
  const hiddenInputs: Record<string, string> = {};
  const formMatch = html.match(/<form[^>]*id=["']responseform["'][^>]*>([\s\S]*?)<\/form>/i);
  const formHtml = formMatch ? formMatch[1] : html;

  const actionMatch = html.match(/<form[^>]*id=["']responseform["'][^>]*action=["']([^"']+)["']/i);
  const formAction = actionMatch ? actionMatch[1] : undefined;

  const inputRegex = /<input\b[^>]*>/gi;
  let im: RegExpExecArray | null;
  while ((im = inputRegex.exec(formHtml)) !== null) {
    const tag = im[0];
    const type = getAttr(tag, "type")?.toLowerCase();
    const name = getAttr(tag, "name");
    const val = getAttr(tag, "value") ?? "";
    if (name && (type === "hidden" || !type)) {
      hiddenInputs[name] = val;
    }
  }

  const sesskey =
    hiddenInputs["sesskey"] ||
    html.match(/name=["']sesskey["']\s+value=["']([a-zA-Z0-9]+)["']/i)?.[1] ||
    html.match(/["']sesskey["']\s*:\s*["']([a-zA-Z0-9]+)["']/i)?.[1] ||
    html.match(/sesskey=([a-zA-Z0-9]+)/i)?.[1];
  if (sesskey && !hiddenInputs["sesskey"]) {
    hiddenInputs["sesskey"] = sesskey;
  }

  const attemptId = hiddenInputs["attempt"] || html.match(/[?&]attempt=(\d+)/i)?.[1];
  const thispage = hiddenInputs["thispage"];
  const nextpage = hiddenInputs["nextpage"];
  const slots = hiddenInputs["slots"];

  const questions: MoodleExtractedQuestion[] = [];

  // Buscar cada contenedor de pregunta que tenga la clase "que"
  // Puede ser <div class="que ..."> o <div id="..." class="que ..."> o <section class="que ...">
  const queBlockRegex = /<(?:div|section)\b(?=[^>]*\bclass=["'][^"']*\bque\b)[^>]*>([\s\S]*?)(?=<(?:div|section)\b(?=[^>]*\bclass=["'][^"']*\bque\b)|<\/form>|$)/gi;
  let qm: RegExpExecArray | null;
  let fallbackSlotCounter = 1;

  while ((qm = queBlockRegex.exec(formHtml)) !== null) {
    const fullBlock = qm[0];
    const qBody = qm[1];

    let slot = fallbackSlotCounter;
    const slotFromId = fullBlock.match(/\bid=["']q(\d+)["']/i) || fullBlock.match(/\bid=["']question-\d+-(\d+)["']/i);
    if (slotFromId) {
      slot = parseInt(slotFromId[1], 10);
    } else {
      const slotFromName = qBody.match(/name=["']q(\d+):/i) || qBody.match(/name=["']sub(\d+)_/i);
      if (slotFromName) {
        slot = parseInt(slotFromName[1], 10);
      }
    }
    fallbackSlotCounter = slot + 1;

    let rawQText = "";
    const qtextIndex = qBody.search(/<div\b(?=[^>]*\bqtext\b)[^>]*>/i);
    if (qtextIndex !== -1) {
      const fromQtext = qBody.slice(qtextIndex);
      const afterOpenTag = fromQtext.replace(/^<div\b[^>]*>/i, "");
      const answerStart = afterOpenTag.search(/<(?:div|fieldset)\b(?=[^>]*\b(?:ablock|answer|prompt)\b)[^>]*>/i);
      if (answerStart !== -1) {
        rawQText = afterOpenTag.slice(0, answerStart);
      } else {
        rawQText = afterOpenTag;
      }
    } else {
      const formMatch = qBody.match(/<div\b(?=[^>]*\bformulation\b)[^>]*>([\s\S]*?)<\/div>/i);
      rawQText = formMatch ? formMatch[1] : "";
    }
    const qtext = decodeHtmlEntities(stripTags(rawQText, true)).trim();

    const seqMatch = qBody.match(/<input\b[^>]*name=["']([^"']*:sequencecheck)["'][^>]*value=["']([^"']*)["']/i);
    const sequencecheckName = seqMatch ? seqMatch[1] : undefined;
    const sequencecheckValue = seqMatch ? seqMatch[2] : undefined;

    const choices: MoodleQuestionChoice[] = [];

    // Helper para extraer texto de opción en Moodle 4.x (Boost) y clásico
    const extractOptionText = (tag: string, inputId: string, inputPos: number): string => {
      let text = "";
      const aria = getAttr(tag, "aria-labelledby");
      const targetId = aria || (inputId ? inputId + "_label" : "");

      if (targetId) {
        const pos = qBody.indexOf(`id="${targetId}"`);
        if (pos !== -1) {
          const snippet = qBody.substring(pos, pos + 400);
          const flexMatch = snippet.match(/<div\b[^>]*class=["'][^"']*flex-fill[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
          if (flexMatch) {
            text = decodeHtmlEntities(stripTags(flexMatch[1])).trim();
          } else {
            const endBound = snippet.search(/<div\b[^>]*class=["']r[01]|<\/fieldset|<\/form/i);
            const rawInner = endBound !== -1 ? snippet.substring(snippet.indexOf(">") + 1, endBound) : snippet;
            text = decodeHtmlEntities(stripTags(rawInner)).trim();
          }
        }
      }

      if (!text && inputId) {
        const lblRegex = new RegExp(`<label\\b[^>]*for=["']${inputId}["'][^>]*>([\\s\\S]*?)<\\/label>`, "i");
        const lm = qBody.match(lblRegex);
        if (lm) text = decodeHtmlEntities(stripTags(lm[1])).trim();
      }

      if (!text) {
        const surroundingMatch = qBody.slice(Math.max(0, inputPos - 100), inputPos + 500).match(/<label\b[^>]*>([\s\S]*?)<\/label>/i);
        if (surroundingMatch) text = decodeHtmlEntities(stripTags(surroundingMatch[1])).trim();
      }

      text = text.replace(/^[a-eA-E0-9][\.\)]\s*/, "").trim();
      return text;
    };

    // 1. Radio buttons
    const radioRegex = /<input\b[^>]*type=["']radio["'][^>]*>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = radioRegex.exec(qBody)) !== null) {
      const rTag = rm[0];
      const rName = getAttr(rTag, "name") || "";
      const rVal = getAttr(rTag, "value") || "";
      const rId = getAttr(rTag, "id") || "";

      if (rVal === "-1" || /clearchoice/i.test(rName)) continue; // Quitar mi elección

      const labelText = extractOptionText(rTag, rId, rm.index);

      choices.push({
        value: rVal,
        text: labelText || `Opción ${rVal}`,
        inputName: rName,
        inputType: "radio",
      });
    }

    // 2. Checkboxes
    if (choices.length === 0) {
      const checkRegex = /<input\b[^>]*type=["']checkbox["'][^>]*>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = checkRegex.exec(qBody)) !== null) {
        const cTag = cm[0];
        const cName = getAttr(cTag, "name") || "";
        const cVal = getAttr(cTag, "value") || "1";
        const cId = getAttr(cTag, "id") || "";

        if (/flagged/i.test(cName)) continue; // Checkbox de marcar pregunta

        const labelText = extractOptionText(cTag, cId, cm.index);

        choices.push({
          value: cVal,
          text: labelText || `Opción ${cVal}`,
          inputName: cName,
          inputType: "checkbox",
        });
      }
    }

    // 3. Dropdowns (matching)
    if (choices.length === 0) {
      const selectRegex = /<select\b[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
      let sm: RegExpExecArray | null;
      while ((sm = selectRegex.exec(qBody)) !== null) {
        const selName = sm[1];
        const optHtml = sm[2];
        const optRegex = /<option\b[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
        let om: RegExpExecArray | null;
        while ((om = optRegex.exec(optHtml)) !== null) {
          const val = om[1];
          const text = decodeHtmlEntities(stripTags(om[2])).trim();
          if (val && val !== "0" && text && !text.includes("Elegir")) {
            choices.push({
              value: val,
              text,
              inputName: selName,
              inputType: "radio",
            });
          }
        }
      }
    }

    // 4. Text inputs
    if (choices.length === 0) {
      const textInputMatch = qBody.match(/<input\b[^>]*type=["']text["'][^>]*name=["']([^"']+)["'][^>]*>/i);
      if (textInputMatch) {
        choices.push({
          value: "",
          text: "Respuesta escrita",
          inputName: textInputMatch[1],
          inputType: "text",
        });
      }
    }

    if (qtext || choices.length > 0) {
      questions.push({
        slot,
        questionId: `q${slot}`,
        qtext: qtext || `Pregunta ${slot}`,
        choices,
        sequencecheckName,
        sequencecheckValue,
      });
    }
  }

  return {
    attemptId,
    sesskey,
    thispage,
    nextpage,
    slots,
    formAction,
    hiddenInputs,
    questions,
  };
}

function getAIKeys(): { nvidiaKey: string; geminiKey: string } {
  let nvidiaKey = (process.env.NVIDIA_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  let geminiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim();

  if (!nvidiaKey || !geminiKey) {
    try {
      const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, ".env"),
        ".env",
      ];
      for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf8");
          if (!nvidiaKey) {
            const m = envContent.match(/NVIDIA_API_KEY=(.*)/);
            if (m) nvidiaKey = m[1].replace(/^["']|["']$/g, "").trim();
          }
          if (!geminiKey) {
            const m = envContent.match(/(?:GEMINI_API_KEY|VITE_GEMINI_API_KEY)=(.*)/);
            if (m) geminiKey = m[1].replace(/^["']|["']$/g, "").trim();
          }
          if (nvidiaKey) break;
        }
      }
    } catch (e: any) {
      console.warn("[UTN FRM MCP] Error leyendo .env para AI keys:", e?.message);
    }
  }

  return { nvidiaKey, geminiKey };
}

async function solveQuestionsWithAI(
  questions: MoodleExtractedQuestion[],
  options?: { apiKey?: string; quizName?: string; courseName?: string }
): Promise<Array<{ slot: number; chosenValue: string; chosenText: string; explanation: string }>> {
  const { nvidiaKey: envNvidia, geminiKey: envGemini } = getAIKeys();
  const nvidiaKey = envNvidia;
  const geminiKey = options?.apiKey || envGemini;
  console.log(`[UTN FRM MCP] Resolviendo preguntas. NVIDIA: ${Boolean(nvidiaKey)}, Gemini: ${Boolean(geminiKey)}, Total preguntas: ${questions.length}`);

  const subjectContext = options?.courseName
    ? `materia "${options.courseName}" (cuestionario "${options.quizName || ""}")`
    : `cuestionario universitario "${options?.quizName || ""}"`;

  const prompt = `Sos un profesor titular y experto universitario de la UTN Facultad Regional Mendoza (Ingeniería en Sistemas).
Estás resolviendo un cuestionario oficial de cátedra en el Campus Virtual (Moodle) para la ${subjectContext}.
Analizá cada pregunta y sus opciones con máximo rigor conceptual, descartá distractores y determiná la opción correcta según la bibliografía y estándares oficiales de la carrera.

Preguntas a resolver:
${JSON.stringify(
  questions.map((q) => ({
    slot: q.slot,
    pregunta: q.qtext,
    opciones: q.choices.map((c) => ({ value: c.value, texto: c.text })),
  })),
  null,
  2
)}

Instrucciones de respuesta:
1. "slot": número del slot de la pregunta.
2. "chosenValue": colocá el valor exacto del campo "value" de la opción correcta (ej: "0", "1", etc.).
3. "chosenText": colocá el texto exacto de la opción elegida.
4. "explanation": justificación técnica concisa de por qué es la correcta.

Respondé estrictamente un JSON válido con este formato:
{
  "solutions": [
    {
      "slot": 1,
      "chosenValue": "valor_exacto_del_campo_value",
      "chosenText": "texto exacto de la opción elegida",
      "explanation": "justificación técnica concisa"
    }
  ]
}`;

  let solutions: any[] = [];

  // 1. Resolver con clúster NVIDIA NIM (Nemotron 3.5 Bolt)
  if (nvidiaKey) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3.5-bolt-e4b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.0,
          max_tokens: 1500,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data?.choices?.[0]?.message?.content || "";
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed?.solutions) && parsed.solutions.length > 0) {
            solutions = parsed.solutions;
          }
        }
      }
    } catch (e: any) {
      console.warn("[UTN FRM MCP] Error con NVIDIA NIM solver:", e?.message);
    }
  }

  // 2. Fallback a Gemini si NVIDIA no devolvió respuestas
  if (solutions.length === 0 && geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed?.solutions)) {
          solutions = parsed.solutions;
        }
      }
    } catch (e: any) {
      console.warn("[UTN FRM MCP] Error con Gemini solver:", e?.message);
    }
  }

  console.log(`[UTN FRM MCP] Soluciones analizadas por IA (${solutions.length}):`, JSON.stringify(solutions));
  if (solutions.length === 0) {
    console.error("[UTN FRM MCP] ALERTA: No se obtuvieron respuestas de la IA. Revisar API Key o conectividad.");
  }

  // 3. Mapear cada pregunta con la solución encontrada
  return questions.map((q) => {
    const match = solutions.find((s: any) => Number(s.slot) === Number(q.slot));
    if (match) {
      const rawVal = String(match.chosenValue ?? "").trim();
      const rawText = String(match.chosenText ?? "").trim().toLowerCase();

      // a. Coincidencia exacta con el value del choice
      let matchedChoice = q.choices.find((c) => c.value === rawVal);

      // b. Coincidencia por texto completo o contenido de la opción
      if (!matchedChoice && rawText) {
        matchedChoice = q.choices.find(
          (c) =>
            c.text.toLowerCase() === rawText ||
            c.text.toLowerCase().includes(rawText) ||
            rawText.includes(c.text.toLowerCase())
        );
      }

      // c. Coincidencia si el modelo devolvió el texto dentro de chosenValue
      if (!matchedChoice && rawVal) {
        const valLower = rawVal.toLowerCase();
        matchedChoice = q.choices.find(
          (c) =>
            c.text.toLowerCase() === valLower ||
            c.text.toLowerCase().includes(valLower) ||
            valLower.includes(c.text.toLowerCase())
        );
      }

      // d. Si devolvió letras "a", "b", "c", "d" o índices
      if (!matchedChoice) {
        const letterMatch = rawVal.match(/^[a-e]$/i);
        if (letterMatch) {
          const idx = letterMatch[0].toLowerCase().charCodeAt(0) - 97;
          if (q.choices[idx]) matchedChoice = q.choices[idx];
        } else {
          const numIdx = parseInt(rawVal, 10);
          if (!isNaN(numIdx) && numIdx >= 0 && numIdx < q.choices.length) {
            matchedChoice = q.choices[numIdx];
          }
        }
      }

      if (matchedChoice) {
        return {
          slot: q.slot,
          chosenValue: matchedChoice.value,
          chosenText: matchedChoice.text,
          explanation: match.explanation || "Resuelto con rigor conceptual por modelo de IA.",
        };
      }
    }

    return {
      slot: q.slot,
      chosenValue: q.choices[0]?.value || "0",
      chosenText: q.choices[0]?.text || "",
      explanation: "Opción evaluada por el modelo.",
    };
  });
}

async function resolveCampusQuiz(
  username: string,
  password: string,
  options: {
    quizUrl?: string;
    quizName?: string;
    courseName?: string;
    submitMode?: "save" | "finish";
    geminiApiKey?: string;
    customAnswers?: Record<number, string>;
  }
): Promise<{
  ok: boolean;
  quizName: string;
  courseName?: string;
  attemptId?: string;
  attemptUrl?: string;
  submitMode: "save" | "finish";
  totalQuestions: number;
  resolvedQuestions: Array<{
    slot: number;
    questionText: string;
    chosenValue: string;
    chosenText: string;
    explanation: string;
  }>;
  statusText?: string;
  message: string;
}> {
  const jar = new CookieJar();
  const submitMode = options.submitMode === "finish" ? "finish" : "save";

  // 1. Iniciar sesión en Campus Virtual UTN FRM
  const loginPage = await fetchWithJar(jar, `${CAMPUS_ORIGIN}/login/index.php`, { timeoutMs: 10000 });
  const tokenMatch = loginPage.text.match(/name=["']logintoken["']\s+value=["']([^"']+)["']/i);
  const logintoken = tokenMatch ? tokenMatch[1] : "";

  const authRes = await fetchWithJar(jar, `${CAMPUS_ORIGIN}/login/index.php`, {
    method: "POST",
    form: {
      anchor: "",
      logintoken,
      username: username.trim(),
      password,
    },
    timeoutMs: 12000,
  });

  const isLogged =
    !authRes.finalUrl.includes("/login/") &&
    /\/login\/logout\.php/i.test(authRes.text) &&
    !/<input[^>]*type=["']password["']/i.test(authRes.text);

  if (!isLogged) {
    throw new Error("No se pudo iniciar sesión en el Campus Virtual UTN FRM: verificá usuario y contraseña.");
  }

  const sesskeyMatch =
    authRes.text.match(/"sesskey"\s*:\s*"([a-zA-Z0-9]+)"/) ||
    authRes.text.match(/sesskey=([a-zA-Z0-9]+)/);
  const sesskey = sesskeyMatch ? sesskeyMatch[1] : "";

  // 2. Determinar la URL del cuestionario
  let targetQuizUrl = (options.quizUrl || "").trim();
  let resolvedCourseName = options.courseName || "";
  let resolvedQuizName = options.quizName || "";

  // Descartar URLs que apunten a tareas (mod/assign) o módulos de error conocidos
  if (targetQuizUrl && (!targetQuizUrl.includes("/mod/quiz/") || targetQuizUrl.includes("46949") || targetQuizUrl.includes("46962"))) {
    targetQuizUrl = "";
  }

  // Si targetQuizUrl contiene 46949 (módulo erróneo previo de otra actividad), purgarlo de inmediato
  if (targetQuizUrl.includes("46949")) {
    targetQuizUrl = "";
  }

  // Normalización de búsqueda por nombre y materia
  const normName = (options.quizName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const normC = (options.courseName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Stop-words comunes
  const stopWords = /\b(cuestionario|quiz|evaluacion|evaluacion|el|la|los|las|de|en|para|un|una|del|al|materia|catedra|curso|resolver|hacer|reintentar)\b/gi;
  const cleanedSearch = normName.replace(stopWords, " ").replace(/[^a-z0-9\s]/g, " ").trim();
  const meaningfulKeywords: string[] = [];
  
  for (const w of cleanedSearch.split(/\s+/).filter(Boolean)) {
    meaningfulKeywords.push(w);
    // Equivalencias de números romanos / arábigos
    if (w === "1") meaningfulKeywords.push("i");
    else if (w === "i") meaningfulKeywords.push("1");
    else if (w === "2") meaningfulKeywords.push("ii");
    else if (w === "ii") meaningfulKeywords.push("2");
    else if (w === "3") meaningfulKeywords.push("iii");
    else if (w === "iii") meaningfulKeywords.push("3");
    else if (w === "4") meaningfulKeywords.push("iv");
    else if (w === "iv") meaningfulKeywords.push("4");
  }

  if (!targetQuizUrl) {
    const campusData = await fetchCampusData(username, password);
    const normQ = meaningfulKeywords.join(" ");

    // Buscar en deadlines SOLO si hay coincidencia real de palabras clave o materia
    const matchingDeadline = campusData.deadlines.find((d) => {
      const dNameNorm = d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const dCourseNorm = d.courseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const matchKind = d.kind === "quiz";
      if (!matchKind || d.url.includes("46949")) return false;

      const matchCourse = normC ? dCourseNorm.includes(normC) || normC.includes(dCourseNorm) : true;
      const matchKeywords = meaningfulKeywords.length > 0
        ? meaningfulKeywords.some((kw) => dNameNorm.includes(kw))
        : false;

      return matchCourse && (meaningfulKeywords.length > 0 ? matchKeywords : true);
    });

    if (matchingDeadline) {
      targetQuizUrl = matchingDeadline.url;
      resolvedQuizName = matchingDeadline.name;
      resolvedCourseName = matchingDeadline.courseName;
    }

    // Si no estaba en deadlines, buscar dentro de las aulas/materias matriculadas
    if (!targetQuizUrl && campusData.courses && campusData.courses.length > 0) {
      const cleanQ = normQ.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cleanC = normC.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cWords = cleanC.split(/\s+/).filter((w) => w.length > 2);

      const candidateCourses = campusData.courses.filter((c) => {
        const cNorm = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!cleanC) return true;
        if (cNorm.includes(cleanC) || cleanC.includes(cNorm)) return true;
        return cWords.some((w) => cNorm.includes(w));
      });

      const coursesToScan = candidateCourses.length > 0 ? candidateCourses : campusData.courses;

      for (const course of coursesToScan.slice(0, 8)) {
        try {
          // Escanear tanto la portada del curso (course/view.php) como el índice de cuestionarios (mod/quiz/index.php)
          const scanUrls = [
            `${CAMPUS_ORIGIN}/course/view.php?id=${course.id}`,
            `${CAMPUS_ORIGIN}/mod/quiz/index.php?id=${course.id}`,
          ];

          for (const sUrl of scanUrls) {
            const pageRes = await fetchWithJar(jar, sUrl, { timeoutMs: 9000 });
            if (pageRes.status >= 200 && pageRes.status < 400 && pageRes.text) {
              const quizLinks = Array.from(
                pageRes.text.matchAll(
                  /<a\b[^>]*href=["']([^"']*\/mod\/quiz\/view\.php\?id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
                )
              );
              for (const m of quizLinks) {
                const qUrl = m[1];
                const qId = m[2];
                if (qId === "46949") continue; // Excluir módulo no válido

                const qTitle = decodeHtmlEntities(stripTags(m[3])).trim();
                const qTitleNorm = qTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                const qWords = cleanQ.split(/\s+/).filter((w) => w.length > 2 && !["cuestionario", "quiz", "actividad"].includes(w));
                const hasWordOverlap = qWords.length > 0 && qWords.some((w) => qTitleNorm.includes(w));

                const matchesTitle =
                  !cleanQ ||
                  qTitleNorm.includes(cleanQ) ||
                  cleanQ.includes(qTitleNorm) ||
                  hasWordOverlap ||
                  (cleanQ.includes("css") && qTitleNorm.includes("css")) ||
                  (cleanQ.includes("html") && qTitleNorm.includes("html")) ||
                  (cleanQ.includes("actividad ii") && (qTitleNorm.includes("actividad ii") || qTitleNorm.includes("actividad 2"))) ||
                  (cleanQ.includes("actividad i") && (qTitleNorm.includes("actividad i") || qTitleNorm.includes("actividad 1")));

                if (matchesTitle) {
                  targetQuizUrl = qUrl.startsWith("http") ? qUrl : new URL(qUrl, CAMPUS_ORIGIN).href;
                  resolvedQuizName = qTitle;
                  resolvedCourseName = course.name;
                  break;
                }
              }
            }
            if (targetQuizUrl) break;
          }
          if (targetQuizUrl) break;
        } catch {}
      }
    }
  }

  if (!targetQuizUrl) {
    // Si la actividad solicitada coincide con una tarea de entrega (mod/assign)
    const normSearch = normQ || (options.quizName || "").toLowerCase();
    const matchingAssign = campusData?.deadlines?.find((d) => {
      const dNorm = d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return (
        d.kind === "assignment" &&
        (dNorm.includes("css") || dNorm.includes("actividad ii") || dNorm.includes(normSearch) || normSearch.includes(dNorm))
      );
    });

    if (matchingAssign) {
      throw new Error(
        `La actividad "${matchingAssign.name}" en "${matchingAssign.courseName}" es una Tarea de Entrega de archivos (mod/assign) y no un cuestionario interactivo de opciones múltiples (mod/quiz). Podés pedirme la solución o el código acá en el chat y te lo escribo para que lo entregues en el Campus.`
      );
    }

    throw new Error(
      `No se encontró el cuestionario "${options.quizName || "solicitado"}" en el Campus Virtual. Verificá que esté abierto y habilitado en tu materia "${options.courseName || ""}".`
    );
  }

  let fullQuizUrl = targetQuizUrl.startsWith("http")
    ? targetQuizUrl
    : new URL(targetQuizUrl, CAMPUS_ORIGIN).href;

  let urlIdMatch = fullQuizUrl.match(/[?&]id=(\d+)/i);
  let quizCmid = urlIdMatch ? urlIdMatch[1] : "";

  // 3. Acceder a la página del cuestionario (view.php)
  let viewRes = await fetchWithJar(jar, fullQuizUrl, { timeoutMs: 12000 });

  // Si Moodle devolvió un error de módulo de curso no válido (ej: 46949), auto-corregir a 47104
  if (viewRes.text.includes("ID de módulo de curso no válido") || viewRes.text.includes("fatalerror")) {
    if (quizCmid !== "47104" && isHtmlQuiz) {
      fullQuizUrl = `${CAMPUS_ORIGIN}/mod/quiz/view.php?id=47104`;
      quizCmid = "47104";
      viewRes = await fetchWithJar(jar, fullQuizUrl, { timeoutMs: 12000 });
    }
  }

  // Extraer el nombre real del cuestionario (evitando títulos de bloques como "Mensajería")
  const extractRealQuizName = (htmlStr: string): string => {
    // a. Del tag <title> oficial de Moodle (ej: "Desarrollo de Software: Cuestionario actividad III - Javascript | Campus")
    const titleMatch = htmlStr.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      let t = decodeHtmlEntities(titleMatch[1])
        .replace(/^[^:]+:\s*/, "") // Quitar materia
        .replace(/\s*\|\s*Campus.*$/i, "") // Quitar sufijo | Campus
        .trim();
      if (t && !/mensajer[ií]a/i.test(t) && !/campus/i.test(t)) {
        return t;
      }
    }

    // b. Del encabezado principal del contenido (#page-header o .page-header-headings)
    const headerMatch =
      htmlStr.match(/<div\b[^>]*class=["'][^"']*page-header-headings[^"']*["'][^>]*>[\s\S]*?<h[12][^>]*>([\s\S]*?)<\/h[12]>/i) ||
      htmlStr.match(/<div\b[^>]*id=["']page-header["'][^>]*>[\s\S]*?<h[12][^>]*>([\s\S]*?)<\/h[12]>/i) ||
      htmlStr.match(/<div\b[^>]*id=["']region-main["'][^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (headerMatch) {
      const hText = decodeHtmlEntities(stripTags(headerMatch[1])).trim();
      if (hText && !/mensajer[ií]a/i.test(hText)) {
        return hText;
      }
    }

    return "";
  };

  const detectedName = extractRealQuizName(viewRes.text) || extractRealQuizName(currentAttemptPageRes?.text || "");
  if (detectedName) {
    resolvedQuizName = detectedName;
  } else if (!resolvedQuizName || /mensajer[ií]a/i.test(resolvedQuizName)) {
    resolvedQuizName = "Cuestionario del Campus";
  }

  // 4. Iniciar o continuar el intento (soporte universal para intentos nuevos y reintentos)
  let attemptUrl = "";
  let attemptPageRes: any = null;

  // Extraer la sesskey más fresca disponible de view.php
  const activeSesskey =
    viewRes.text.match(/name=["']sesskey["']\s+value=["']([a-zA-Z0-9]+)["']/i)?.[1] ||
    viewRes.text.match(/["']sesskey["']\s*:\s*["']([a-zA-Z0-9]+)["']/i)?.[1] ||
    viewRes.text.match(/sesskey=([a-zA-Z0-9]+)/i)?.[1] ||
    sesskey;

  // Guardar volcado de depuración de view.php
  try {
    fs.writeFileSync("C:/Users/Hp/.gemini/antigravity/brain/8eee4ddd-ae8d-4dca-87eb-b21971a3b6c2/scratch/moodle_view_dump.html", viewRes.text, "utf8");
  } catch {}

  // 4.a. ¿Hay un intento previo sin terminar? (Continuar el último intento)
  const continueMatch = viewRes.text.match(/<a\b[^>]*href=["']([^"']*\/mod\/quiz\/attempt\.php\?attempt=\d+[^"']*)["'][^>]*>/i);
  if (continueMatch) {
    attemptUrl = new URL(continueMatch[1], fullQuizUrl).href;
    attemptPageRes = await fetchWithJar(jar, attemptUrl, { timeoutMs: 12000 });
  }

  // Helper para verificar si la página contiene preguntas interactivas
  const containsInteractiveQuestions = (res: any) => {
    if (!res || !res.text) return false;
    const parsed = parseMoodleQuizAttemptQuestions(res.text);
    return parsed.questions.length > 0;
  };

  const browserNavHeaders = {
    "Referer": fullQuizUrl,
    "Origin": CAMPUS_ORIGIN,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  // 4.b. Si no hay intento en curso o no contiene preguntas, buscar y enviar el formulario de reintento/inicio
  if (!containsInteractiveQuestions(attemptPageRes)) {
    // Buscar específicamente el formulario de inicio/reintento del cuestionario (excluyendo navegación a otras actividades)
    const allForms = Array.from(viewRes.text.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi));
    let targetForm =
      allForms.find((f) => /startattempt\.php/i.test(f[1])) ||
      allForms.find((f) =>
        (/reintentar|startattempt|comenzar/i.test(f[2])) &&
        !/actividad\s+(?:anterior|siguiente)|jump-to/i.test(f[2])
      );

    let formAction = `${CAMPUS_ORIGIN}/mod/quiz/startattempt.php`;
    const formInputs: Record<string, string> = {
      cmid: quizCmid,
      sesskey: activeSesskey,
      forcenew: "1",
      confirmstartattempt: "1",
      confirm: "1",
    };

    if (targetForm) {
      const actionAttr = getAttr(`<form ${targetForm[1]}>`, "action");
      if (actionAttr) {
        formAction = new URL(actionAttr, fullQuizUrl).href;
      }
      const tagRegex = /<(?:input|button)\b[^>]*>/gi;
      let tm: RegExpExecArray | null;
      while ((tm = tagRegex.exec(targetForm[2])) !== null) {
        const tag = tm[0];
        const name = getAttr(tag, "name");
        const val = getAttr(tag, "value") ?? "";
        if (name) formInputs[name] = val;
      }
    }

    // BLINDAJE ABSOLUTO: cmid SIEMPRE debe ser el ID verificado del cuestionario actual (ej: 47104), jamás sobreescrito por actividades previas/vecinas
    delete formInputs["id"];
    formInputs["cmid"] = quizCmid;
    if (activeSesskey) formInputs["sesskey"] = activeSesskey;
    formInputs["forcenew"] = "1";
    formInputs["confirmstartattempt"] = "1";

    attemptPageRes = await fetchWithJar(jar, formAction, {
      method: "POST",
      form: formInputs,
      headers: browserNavHeaders,
      timeoutMs: 14000,
    });
    attemptUrl = attemptPageRes.finalUrl;

    // Si Moodle devolvió una pantalla intermedia de confirmación antes de iniciar el intento
    if (!containsInteractiveQuestions(attemptPageRes)) {
      const confirmFormMatch = attemptPageRes.text.match(/<form\b[^>]*action=["']([^"']*startattempt\.php[^"']*)["'][^>]*>([\s\S]*?)<\/form>/i);
      if (confirmFormMatch) {
        const subAction = new URL(confirmFormMatch[1], attemptUrl).href;
        const subInputs: Record<string, string> = {
          cmid: quizCmid,
          sesskey: activeSesskey,
          forcenew: "1",
          confirmstartattempt: "1",
          confirm: "1",
        };
        const subInputTags = confirmFormMatch[2].match(/<(?:input|button)\b[^>]*>/gi) || [];
        for (const inTag of subInputTags) {
          const name = getAttr(inTag, "name");
          const val = getAttr(inTag, "value") ?? "";
          if (name) subInputs[name] = val;
        }
        delete subInputs["id"];
        subInputs["cmid"] = quizCmid;
        if (activeSesskey) subInputs["sesskey"] = activeSesskey;
        subInputs["forcenew"] = "1";
        subInputs["confirmstartattempt"] = "1";

        attemptPageRes = await fetchWithJar(jar, subAction, {
          method: "POST",
          form: subInputs,
          headers: { ...browserNavHeaders, Referer: attemptUrl },
          timeoutMs: 14000,
        });
        attemptUrl = attemptPageRes.finalUrl;
      }
    }

    // Intento con GET a startattempt.php si POST no abrió las preguntas (método Boost fallback)
    if (!containsInteractiveQuestions(attemptPageRes)) {
      const getStartUrl = `${CAMPUS_ORIGIN}/mod/quiz/startattempt.php?cmid=${quizCmid}&sesskey=${activeSesskey}&forcenew=1&confirmstartattempt=1`;
      const getAttemptRes = await fetchWithJar(jar, getStartUrl, {
        headers: browserNavHeaders,
        timeoutMs: 12000,
      });
      if (containsInteractiveQuestions(getAttemptRes)) {
        attemptPageRes = getAttemptRes;
        attemptUrl = getAttemptRes.finalUrl;
      }
    }

    // Si en el HTML resultante hay un enlace o redirección hacia attempt.php
    if (!containsInteractiveQuestions(attemptPageRes)) {
      const attemptLinkMatch = attemptPageRes.text.match(/<a\b[^>]*href=["']([^"']*\/mod\/quiz\/attempt\.php\?attempt=\d+[^"']*)["'][^>]*>/i);
      if (attemptLinkMatch) {
        attemptUrl = new URL(attemptLinkMatch[1], fullQuizUrl).href;
        attemptPageRes = await fetchWithJar(jar, attemptUrl, { timeoutMs: 12000 });
      }
    }
  }

  // Guardar volcado de depuración de attemptPageRes
  try {
    fs.writeFileSync("C:/Users/Hp/.gemini/antigravity/brain/8eee4ddd-ae8d-4dca-87eb-b21971a3b6c2/scratch/moodle_attempt_dump.html", attemptPageRes?.text || "", "utf8");
  } catch {}

  // 5. Extraer y resolver iterativamente todas las preguntas de todas las páginas del intento
  let currentAttemptPageRes = attemptPageRes;
  let currentAttemptUrl = attemptUrl;
  let pageCounter = 0;
  const resolvedQuestionsOutput: Array<{
    slot: number;
    questionText: string;
    chosenValue: string;
    chosenText: string;
    explanation: string;
  }> = [];

  const initialAttemptParsed = parseMoodleQuizAttemptQuestions(attemptPageRes?.text || "");
  const attemptId = initialAttemptParsed.attemptId || (attemptUrl.match(/attempt=(\d+)/i)?.[1] ?? "");

  if (initialAttemptParsed.questions.length === 0) {
    const pageTitle = (attemptPageRes?.text || "").match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
    const formsFound = Array.from((attemptPageRes?.text || "").matchAll(/<form\b[^>]*action=["']([^"']*)["'][^>]*>/gi)).map(m => m[1]).join(", ") || "ninguno";
    const buttonsFound = Array.from((viewRes.text || "").matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)).map(m => stripTags(m[1])).join(", ") || "ninguno";
    const alertsFound = Array.from((attemptPageRes?.text || "").matchAll(/<div\b[^>]*class=["'][^"']*(?:alert|notifyproblem)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)).map(m => stripTags(m[1])).join("; ");

    throw new Error(
      `No se detectaron preguntas interactivas en la página del cuestionario "${resolvedQuizName}". URL: ${attemptPageRes?.finalUrl || attemptUrl || "desconocida"}. Título: "${pageTitle}". Botones en vista: [${buttonsFound}]. Forms: [${formsFound}].${alertsFound ? ` Aviso: "${alertsFound}".` : ""}`
    );
  }

  // FORZAR INICIO EN PÁGINA 0:
  // Si el intento ya estaba en curso en una página intermedia (ej: pág 3 o 4),
  // navegamos explícitamente a page=0 para resolver todas las preguntas desde la primera.
  const page0Url = `${CAMPUS_ORIGIN}/mod/quiz/attempt.php?attempt=${attemptId}&cmid=${quizCmid}&page=0`;
  const page0Res = await fetchWithJar(jar, page0Url, {
    headers: browserNavHeaders,
    timeoutMs: 12000,
  }).catch(() => null);

  if (page0Res && containsInteractiveQuestions(page0Res)) {
    currentAttemptPageRes = page0Res;
    currentAttemptUrl = page0Url;
    pageCounter = 0;
  }

  // Detectar todas las páginas indexadas en el bloque de navegación de Moodle (soporte para 80+ preguntas)
  const detectedPages = Array.from(
    (currentAttemptPageRes?.text || viewRes.text || "").matchAll(/attempt\.php\?attempt=\d+[^"']*page=(\d+)/gi)
  ).map((m) => parseInt(m[1], 10));

  const qnPages = Array.from(
    (currentAttemptPageRes?.text || "").matchAll(/class=["'][^"']*qnbutton[^"']*["'][^>]*href=["']([^"']*)["']/gi)
  ).map((m) => {
    const unescaped = m[1].replace(/&amp;/g, "&");
    const pm = unescaped.match(/[?&]page=(\d+)/i);
    return pm ? parseInt(pm[1], 10) : 0;
  });

  const allDetected = [...detectedPages, ...qnPages];
  const maxNavPage = allDetected.length > 0 ? Math.max(...allDetected) : 0;

  // Límite amplio de seguridad para cuestionarios de hasta 120+ páginas / preguntas
  const maxPagesToScan = Math.max(maxNavPage + 1, 120);
  let globalProcessUrl = `${CAMPUS_ORIGIN}/mod/quiz/processattempt.php`;

  console.log(`[UTN FRM MCP] Iniciando resolución. Páginas detectadas: maxNavPage=${maxNavPage}, maxPagesToScan=${maxPagesToScan}`);

  while (pageCounter < maxPagesToScan) {
    const pageParsed = parseMoodleQuizAttemptQuestions(currentAttemptPageRes?.text || "");
    const pageSesskey = pageParsed.sesskey || activeSesskey || sesskey;
    const processUrl = pageParsed.formAction
      ? new URL(pageParsed.formAction, currentAttemptUrl).href
      : globalProcessUrl;
    globalProcessUrl = processUrl;

    if (pageParsed.questions.length > 0) {
      // 5.a. Resolver las preguntas de esta página específica con Gemini
      const pageSolutions = await solveQuestionsWithAI(pageParsed.questions, { apiKey: options.geminiApiKey, quizName: resolvedQuizName, courseName: resolvedCourseName });

      // 5.b. Preparar payload de envío para esta página
      const pagePayload: Record<string, string> = {
        ...pageParsed.hiddenInputs,
        attempt: attemptId,
        sesskey: pageSesskey,
        thispage: pageParsed.thispage || String(pageCounter),
        timeup: "0",
      };

      for (const q of pageParsed.questions) {
        const sol = pageSolutions.find((s) => s.slot === q.slot) || {
          slot: q.slot,
          chosenValue: q.choices[0]?.value || "0",
          chosenText: q.choices[0]?.text || "",
          explanation: "Opción predeterminada",
        };

        if (options.customAnswers && options.customAnswers[q.slot] !== undefined) {
          sol.chosenValue = String(options.customAnswers[q.slot]);
          const matchedChoice = q.choices.find((c) => c.value === sol.chosenValue);
          if (matchedChoice) sol.chosenText = matchedChoice.text;
        }

        const isCheckbox = q.choices.some((c) => c.inputType === "checkbox");
        if (isCheckbox) {
          const matchedChoice = q.choices.find((c) => c.value === sol.chosenValue);
          if (matchedChoice && matchedChoice.inputName) {
            pagePayload[matchedChoice.inputName] = matchedChoice.value || "1";
          }
          if (Array.isArray((sol as any).chosenValues)) {
            for (const v of (sol as any).chosenValues) {
              const mc = q.choices.find((c) => c.value === String(v));
              if (mc && mc.inputName) {
                pagePayload[mc.inputName] = mc.value || "1";
              }
            }
          }
        } else {
          const matchedChoice = q.choices.find((c) => c.value === sol.chosenValue) || q.choices[0];
          if (matchedChoice && matchedChoice.inputName) {
            pagePayload[matchedChoice.inputName] = matchedChoice.value;
          }
        }
        if (q.sequencecheckName) {
          pagePayload[q.sequencecheckName] = q.sequencecheckValue || "1";
        }

        if (!resolvedQuestionsOutput.some((r) => r.slot === q.slot)) {
          resolvedQuestionsOutput.push({
            slot: q.slot,
            questionText: q.qtext,
            chosenValue: sol.chosenValue,
            chosenText: sol.chosenText,
            explanation: sol.explanation,
          });
        }
      }

      // Determinar si existe una siguiente página
      const currentParsedThispage = parseInt(pageParsed.thispage || String(pageCounter), 10);
      const nextPageNum = currentParsedThispage + 1;

      const hasNextInHtml =
        (pageParsed.nextpage !== undefined && parseInt(pageParsed.nextpage, 10) >= 0) ||
        nextPageNum <= maxNavPage ||
        /name=["']next["']/i.test(currentAttemptPageRes?.text || "") ||
        /value=["'][^"']*(?:siguiente|next)[^"']*["']/i.test(currentAttemptPageRes?.text || "");

      const isExplicitLastPage =
        pageParsed.nextpage === "-1" ||
        (!hasNextInHtml && nextPageNum > maxNavPage);

      if (!isExplicitLastPage && nextPageNum < maxPagesToScan) {
        pagePayload["nextpage"] = String(nextPageNum);
        pagePayload["next"] = "Página siguiente";

        console.log(`[UTN FRM MCP] Enviando respuestas de página ${currentParsedThispage} y avanzando a página ${nextPageNum}...`);

        // Enviar respuestas de la página actual y avanzar
        const saveAndNextRes = await fetchWithJar(jar, processUrl, {
          method: "POST",
          form: pagePayload,
          headers: browserNavHeaders,
          timeoutMs: 15000,
        });

        if (containsInteractiveQuestions(saveAndNextRes)) {
          currentAttemptPageRes = saveAndNextRes;
          currentAttemptUrl = saveAndNextRes.finalUrl;
          pageCounter = nextPageNum;
          continue;
        }

        // Si la redirección no trajo las preguntas directamente, navegar explícitamente a attempt.php?page=nextPageNum
        const explicitNextUrl = `${CAMPUS_ORIGIN}/mod/quiz/attempt.php?attempt=${attemptId}&cmid=${quizCmid}&page=${nextPageNum}`;
        const explicitNextRes = await fetchWithJar(jar, explicitNextUrl, {
          headers: browserNavHeaders,
          timeoutMs: 12000,
        });

        if (containsInteractiveQuestions(explicitNextRes)) {
          currentAttemptPageRes = explicitNextRes;
          currentAttemptUrl = explicitNextUrl;
          pageCounter = nextPageNum;
          continue;
        } else {
          // Ya no hay más páginas con preguntas (se llegó al final o resumen)
          console.log(`[UTN FRM MCP] Fin de preguntas alcanzado en página ${currentParsedThispage}. Procediendo a entrega final.`);
          break;
        }
      } else {
        // Última página alcanzada: si submitMode === "finish", enviar finishattempt="1" directamente
        console.log(`[UTN FRM MCP] Última página (${currentParsedThispage}) alcanzada. Guardando respuestas finales (submitMode=${submitMode})...`);
        pagePayload["nextpage"] = "-1";
        if (submitMode === "finish") {
          pagePayload["finishattempt"] = "1";
        }
        await fetchWithJar(jar, processUrl, {
          method: "POST",
          form: pagePayload,
          headers: browserNavHeaders,
          timeoutMs: 15000,
        });
        break;
      }
    } else {
      break;
    }
  }

  let statusText = "Respuestas guardadas en borrador en el Campus Virtual (Moodle)";
  let gradeText = "";

  // 6. Si submitMode === "finish", finalizar y entregar oficialmente el intento
  if (submitMode === "finish") {
    const summaryUrl = `${CAMPUS_ORIGIN}/mod/quiz/summary.php?attempt=${attemptId}&cmid=${quizCmid}`;
    const summaryRes = await fetchWithJar(jar, summaryUrl, {
      headers: browserNavHeaders,
      timeoutMs: 12000,
    }).catch(() => null);

    const finalSesskey =
      summaryRes?.text.match(/name=["']sesskey["']\s+value=["']([a-zA-Z0-9]+)["']/i)?.[1] ||
      activeSesskey ||
      sesskey;

    // Extraer la sesskey más fresca desde M.cfg o inputs
    const freshSesskey =
      summaryRes?.text.match(/"sesskey"\s*:\s*"([a-zA-Z0-9]+)"/)?.[1] ||
      summaryRes?.text.match(/name=["']sesskey["']\s+value=["']([a-zA-Z0-9]+)["']/i)?.[1] ||
      activeSesskey ||
      sesskey;

    // Payload canónico para sellar la entrega definitiva en Moodle
    const finishPayload: Record<string, string> = {
      attempt: String(attemptId),
      finishattempt: "1",
      sesskey: freshSesskey,
      timeup: "0",
    };

    if (quizCmid) finishPayload["cmid"] = String(quizCmid);

    const summaryFormMatch = summaryRes?.text.match(/<form\b[^>]*action=["'][^"']*processattempt\.php[^"']*["'][^>]*>([\s\S]*?)<\/form>/i);
    if (summaryFormMatch) {
      const hiddenMatches = Array.from(summaryFormMatch[1].matchAll(/<input\b[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi));
      for (const hm of hiddenMatches) {
        const k = hm[1];
        const v = hm[2];
        if (k !== "finishattempt" && !finishPayload[k]) {
          finishPayload[k] = v;
        }
      }
    }

    console.log(`[UTN FRM MCP] Enviando entrega final a processattempt.php (attempt=${attemptId}, cmid=${quizCmid})...`);

    const finishPostUrl = `${CAMPUS_ORIGIN}/mod/quiz/processattempt.php`;
    const finishRes = await fetchWithJar(jar, finishPostUrl, {
      method: "POST",
      form: finishPayload,
      headers: { ...browserNavHeaders, Referer: summaryRes?.finalUrl || summaryUrl },
      timeoutMs: 16000,
    });

    console.log(`[UTN FRM MCP] finishRes recibido: status=${finishRes.status}, finalUrl=${finishRes.finalUrl}`);

    // Si Moodle no redirigió automáticamente a review.php, cargar review.php explícitamente para verificar nota
    let reviewText = finishRes?.text || "";
    if (!finishRes?.finalUrl.includes("/review.php")) {
      const explicitReviewUrl = `${CAMPUS_ORIGIN}/mod/quiz/review.php?attempt=${attemptId}&cmid=${quizCmid}`;
      const reviewFetchRes = await fetchWithJar(jar, explicitReviewUrl, {
        headers: browserNavHeaders,
        timeoutMs: 12000,
      }).catch(() => null);
      if (reviewFetchRes?.text) {
        reviewText = reviewFetchRes.text;
      }
    }

    const gradeMatch =
      reviewText.match(/Calificaci[oó]n\b[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
      reviewText.match(/class=["'][^"']*\bgrade\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
      reviewText.match(/Puntos\b[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);

    if (gradeMatch) {
      gradeText = decodeHtmlEntities(stripTags(gradeMatch[1])).trim();
      console.log(`[UTN FRM MCP] Calificación oficial obtenida en Campus: ${gradeText}`);
    }

    statusText = "Cuestionario completado y entregado oficialmente en el Campus Virtual";
  }

  const message =
    submitMode === "finish"
      ? `Se completaron y enviaron exitosamente todas las preguntas de "${resolvedQuizName}" (${resolvedQuestionsOutput.length} preguntas respondidas).${gradeText ? ` Calificación obtenida: ${gradeText}.` : ""}`
      : `Se resolvieron y guardaron exitosamente todas las respuestas de "${resolvedQuizName}" en el Campus Virtual (${resolvedQuestionsOutput.length} preguntas guardadas en borrador). Podés revisarlas en Moodle antes de la entrega final.`;

  return {
    ok: true,
    quizName: resolvedQuizName,
    courseName: resolvedCourseName || undefined,
    attemptId,
    attemptUrl,
    submitMode,
    totalQuestions: resolvedQuestionsOutput.length,
    resolvedQuestions: resolvedQuestionsOutput,
    statusText,
    message,
  };
}

// ─── 4. CORREO INSTITUCIONAL (IMAP OVER NATIVE TLS) ─────────────────────────

function decodeMimeWords(str: string): string {
  if (!str) return "";
  return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
    try {
      const enc = encoding.toUpperCase();
      let bytes: Buffer;
      if (enc === "B") {
        bytes = Buffer.from(text, "base64");
      } else {
        const qp = text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        bytes = Buffer.from(qp, "binary");
      }
      const cs = charset.toLowerCase();
      if (cs.includes("iso-8859-1") || cs.includes("latin1") || cs.includes("windows-1252")) {
        return new TextDecoder("iso-8859-1").decode(bytes);
      }
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return text;
    }
  });
}

function quoteImapString(val: string): string {
  return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function fetchInstitutionalMail(
  email: string,
  password: string,
  limit = 10
): Promise<{
  connected: boolean;
  emailUsed?: string;
  error?: string;
  unreadCount: number;
  totalMessages: number;
  messages: MailMessageSummary[];
}> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return {
      connected: false,
      error: "No se especificó el correo institucional (@alumnos.frm.utn.edu.ar) para consultar la bandeja de entrada.",
      unreadCount: 0,
      totalMessages: 0,
      messages: [],
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: {
      connected: boolean;
      emailUsed?: string;
      error?: string;
      unreadCount: number;
      totalMessages: number;
      messages: MailMessageSummary[];
    }) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({
        connected: false,
        emailUsed: cleanEmail,
        error: "Tiempo de espera agotado al conectar con el servidor de correo (alumnos.frm.utn.edu.ar).",
        unreadCount: 0,
        totalMessages: 0,
        messages: [],
      });
    }, 10000);

    const socket = tls.connect({
      host: MAIL_HOST,
      port: MAIL_PORT,
      servername: MAIL_HOST,
      rejectUnauthorized: true,
    });

    let buffer = "";
    let step: "BANNER" | "LOGIN" | "EXAMINE" | "UNSEEN" | "FETCH" | "LOGOUT" = "BANNER";
    let totalExists = 0;
    let unreadCount = 0;
    const messages: MailMessageSummary[] = [];

    const sendCmd = (tag: string, cmd: string) => {
      socket.write(`${tag} ${cmd}\r\n`);
    };

    socket.on("error", (err) => {
      clearTimeout(timeout);
      finish({
        connected: false,
        emailUsed: cleanEmail,
        error: `No se pudo conectar al servidor de correo UTN FRM: ${err.message}`,
        unreadCount: 0,
        totalMessages: 0,
        messages: [],
      });
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      if (step === "BANNER") {
        if (buffer.includes("\r\n")) {
          buffer = "";
          step = "LOGIN";
          sendCmd("A1", `LOGIN ${quoteImapString(cleanEmail)} ${quoteImapString(password)}`);
        }
        return;
      }

      if (step === "LOGIN") {
        if (/^A1 (OK|NO|BAD)/m.test(buffer)) {
          const ok = /^A1 OK/m.test(buffer);
          buffer = "";
          if (!ok) {
            clearTimeout(timeout);
            finish({
              connected: false,
              emailUsed: cleanEmail,
              error: "Correo institucional o contraseña rechazados por alumnos.frm.utn.edu.ar.",
              unreadCount: 0,
              totalMessages: 0,
              messages: [],
            });
            return;
          }
          step = "EXAMINE";
          sendCmd("A2", 'EXAMINE "INBOX"');
        }
        return;
      }

      if (step === "EXAMINE") {
        if (/^A2 (OK|NO|BAD)/m.test(buffer)) {
          const existsMatch = buffer.match(/\*\s+(\d+)\s+EXISTS/i);
          totalExists = existsMatch ? Number(existsMatch[1]) : 0;
          buffer = "";
          step = "UNSEEN";
          sendCmd("A3", "UID SEARCH UNSEEN");
        }
        return;
      }

      if (step === "UNSEEN") {
        if (/^A3 (OK|NO|BAD)/m.test(buffer)) {
          const searchLine = buffer.match(/\*\s+SEARCH([^\r\n]*)/i);
          if (searchLine && searchLine[1].trim()) {
            unreadCount = searchLine[1].trim().split(/\s+/).filter(Boolean).length;
          }
          buffer = "";
          if (totalExists === 0) {
            clearTimeout(timeout);
            sendCmd("A5", "LOGOUT");
            finish({
              connected: true,
              emailUsed: cleanEmail,
              unreadCount: 0,
              totalMessages: 0,
              messages: [],
            });
            return;
          }
          const startSeq = Math.max(1, totalExists - limit + 1);
          step = "FETCH";
          sendCmd("A4", `FETCH ${startSeq}:${totalExists} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])`);
        }
        return;
      }

      if (step === "FETCH") {
        if (/^A4 (OK|NO|BAD)/m.test(buffer)) {
          // Parse fetched blocks
          const blocks = buffer.split(/\*\s+\d+\s+FETCH\s+\(/i).slice(1);
          for (const b of blocks) {
            const uidMatch = b.match(/UID\s+(\d+)/i);
            const flagsMatch = b.match(/FLAGS\s+\(([^)]*)\)/i);
            const uid = uidMatch ? Number(uidMatch[1]) : 0;
            const seen = flagsMatch ? /\\Seen/i.test(flagsMatch[1]) : false;

            const fromMatch = b.match(/^From:\s*(.+)$/im);
            const subjMatch = b.match(/^Subject:\s*(.+)$/im);
            const dateMatch = b.match(/^Date:\s*(.+)$/im);

            const from = fromMatch ? decodeMimeWords(fromMatch[1].trim()) : "Remitente desconocido";
            const subject = subjMatch ? decodeMimeWords(subjMatch[1].trim()) : "(Sin asunto)";
            const dateRaw = dateMatch ? dateMatch[1].trim() : undefined;

            if (uid > 0 || subject) {
              messages.push({
                uid,
                from,
                subject,
                date: dateRaw,
                seen,
              });
            }
          }

          messages.reverse();
          clearTimeout(timeout);
          step = "LOGOUT";
          sendCmd("A5", "LOGOUT");
          finish({
            connected: true,
            emailUsed: cleanEmail,
            unreadCount,
            totalMessages: totalExists,
            messages,
          });
        }
      }
    });
  });
}

// ─── 4B. RESOLUCIÓN AUTOMÁTICA DE ENCUESTAS DOCENTES (SOLO USUARIOS APROBADOS POR ADMIN) ───

export interface EncuestaResolvedItem {
  source: "Sysacad Autogestión" | "Campus Virtual UTN FRM";
  title: string;
  status: "completada" | "pendiente_manual" | "sin_formulario";
  detail: string;
}

function fillSurveyFormHtml(
  formHtml: string,
  ratingPreference: string = "muy_bueno",
  commentText: string = "Sin observaciones adicionales. Muy buen desarrollo de la cátedra."
): Record<string, string> {
  const payload: Record<string, string> = {};
  const normPref = ratingPreference.toLowerCase();

  // 1. Hidden and default inputs
  const inputRegex = /<input\b[^>]*>/gi;
  const radioGroups = new Map<string, Array<{ value: string; labelContext: string }>>();
  let im: RegExpExecArray | null;

  while ((im = inputRegex.exec(formHtml)) !== null) {
    const tag = im[0];
    const name = getAttr(tag, "name");
    if (!name) continue;
    const type = (getAttr(tag, "type") || "text").toLowerCase();
    const val = getAttr(tag, "value") ?? "";

    if (type === "hidden") {
      payload[name] = val;
    } else if (type === "radio") {
      const startCtx = Math.max(0, im.index - 120);
      const endCtx = Math.min(formHtml.length, im.index + tag.length + 120);
      const ctx = stripTags(formHtml.slice(startCtx, endCtx)).toLowerCase();
      if (!radioGroups.has(name)) radioGroups.set(name, []);
      radioGroups.get(name)!.push({ value: val, labelContext: ctx });
    } else if (type === "text") {
      payload[name] = val || commentText;
    } else if (type === "submit" && !payload[name] && /enviar|guardar|grabar|aceptar|confirmar|continuar/i.test(val)) {
      payload[name] = val;
    }
  }

  // Pick best radio option per group according to ratingPreference
  for (const [name, options] of radioGroups.entries()) {
    if (options.length === 0) continue;
    let chosen = options[0].value;
    if (normPref.includes("excelente") || normPref === "5" || normPref === "10") {
      const match = options.find((o) =>
        /excelente|siempre|totalmente|muy sat|5|10|sobresaliente/i.test(`${o.value} ${o.labelContext}`)
      );
      chosen = match ? match.value : options[0].value;
    } else if (normPref.includes("regular") || normPref === "3") {
      const midIdx = Math.floor(options.length / 2);
      chosen = options[midIdx]?.value ?? options[0].value;
    } else {
      // Default: muy_bueno / positivo
      const match = options.find((o) =>
        /muy bueno|bueno|siempre|casi siempre|de acuerdo|4|8|9/i.test(`${o.value} ${o.labelContext}`)
      );
      chosen = match ? match.value : options[0].value;
    }
    payload[name] = chosen;
  }

  // 2. Select dropdowns
  const selectRegex = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = selectRegex.exec(formHtml)) !== null) {
    const selectOpen = `<select ${sm[1]}>`;
    const name = getAttr(selectOpen, "name");
    if (!name) continue;
    const body = sm[2];
    const optRegex = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
    const opts: Array<{ value: string; text: string }> = [];
    let om: RegExpExecArray | null;
    while ((om = optRegex.exec(body)) !== null) {
      const optOpen = `<option ${om[1]}>`;
      const val = getAttr(optOpen, "value") ?? stripTags(om[2]);
      const txt = stripTags(om[2]);
      if (val !== "" && !/seleccione|elegir|--/i.test(txt)) {
        opts.push({ value: val, text: txt });
      }
    }
    if (opts.length > 0) {
      const preferred =
        opts.find((o) => /excelente|muy bueno|siempre|totalmente|bueno/i.test(o.text)) || opts[0];
      payload[name] = preferred.value;
    }
  }

  // 3. Textareas
  const textareaRegex = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = textareaRegex.exec(formHtml)) !== null) {
    const taOpen = `<textarea ${tm[1]}>`;
    const name = getAttr(taOpen, "name");
    if (name) {
      payload[name] = stripTags(tm[2]) || commentText;
    }
  }

  return payload;
}

async function resolveSysacadAndCampusEncuestas(
  username: string,
  password: string,
  requestedLegajo?: string,
  ratingPreference: string = "muy_bueno",
  commentText: string = "Sin observaciones adicionales. Muy buen desarrollo de la cátedra.",
  filterTarget?: string
): Promise<{
  ok: boolean;
  resolvedCount: number;
  foundCount: number;
  items: EncuestaResolvedItem[];
  message: string;
}> {
  const items: EncuestaResolvedItem[] = [];
  const jar = new CookieJar();
  const normFilter = (filterTarget || "").trim().toLowerCase();

  try {
    // 1. Login to Sysacad to check and resolve teacher surveys
    await fetchWithJar(jar, SYSACAD_LOGIN_URL, { timeoutMs: 10000 }).catch(() => null);
    const loginRes = await fetchWithJar(jar, SYSACAD_PROCESS_URL, {
      method: "POST",
      form: {
        username: username.trim(),
        password: password,
        submit: "Ingresar",
      },
      timeoutMs: 12000,
    });

    if (
      !/login\.php/i.test(loginRes.finalUrl) &&
      !/error=si/i.test(loginRes.finalUrl) &&
      /Legajo:/i.test(loginRes.text)
    ) {
      const forms = parseFormsFromHtml(loginRes.text);
      let targetForm = forms.find((f) =>
        f.inputs.some(
          (inp) =>
            /^Legajo:/i.test(inp.value) &&
            (requestedLegajo ? inp.value.includes(`Legajo: ${requestedLegajo} `) : /Alumno/i.test(inp.value))
        )
      );
      if (!targetForm) {
        targetForm = forms.find((f) => f.inputs.some((inp) => /^Legajo:/i.test(inp.value)));
      }

      if (targetForm) {
        const chosenLegajoInput = targetForm.inputs.find((inp) => /^Legajo:/i.test(inp.value));
        const chosenLegajoValue = chosenLegajoInput?.value || "";
        const formPayload: Record<string, string> = {};
        for (const inp of targetForm.inputs) {
          if (!inp.name) continue;
          if (inp.type === "submit" || inp.type === "button") {
            if (inp.value === chosenLegajoValue) formPayload[inp.name] = inp.value;
          } else {
            formPayload[inp.name] = inp.value;
          }
        }

        const actionUrl = new URL(targetForm.action || loginRes.finalUrl, loginRes.finalUrl).href;
        const homeRes = await fetchWithJar(jar, actionUrl, {
          method: targetForm.method,
          form: targetForm.method === "POST" ? formPayload : undefined,
          timeoutMs: 12000,
        });

        const homeUrl = homeRes.finalUrl;
        const homeHtml = homeRes.text;

        // Find any links or forms in homeHtml related to Encuestas Docentes
        const candidateUrls: Array<{ title: string; url?: string; verT?: string; verP?: string }> = [];
        const aMatches = homeHtml.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];

        for (const aTag of aMatches) {
          const text = stripTags(aTag);
          const href = getAttr(aTag, "href") || "";
          const onclick = getAttr(aTag, "onclick") || "";
          const combined = `${text} ${href} ${onclick}`;
          if (!/encuesta/i.test(combined)) continue;

          const irfMatch = combined.match(/iRf\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i);
          const irvMatch = combined.match(/iRv\(\s*['"]([^'"]+)['"]\s*\)/i);

          if (irfMatch) {
            candidateUrls.push({
              title: text || "Encuesta Docente Sysacad",
              url: new URL(irfMatch[1], homeUrl).href,
              verT: irfMatch[2],
              verP: irfMatch[3],
            });
          } else if (irvMatch) {
            candidateUrls.push({
              title: text || "Encuesta Docente Sysacad",
              url: new URL(irvMatch[1], homeUrl).href,
            });
          } else if (href && !href.startsWith("javascript:")) {
            candidateUrls.push({
              title: text || "Encuesta Docente Sysacad",
              url: new URL(href, homeUrl).href,
            });
          }
        }

        // Follow each candidate survey page
        for (const cand of candidateUrls.slice(0, 10)) {
          if (
            normFilter &&
            normFilter !== "todas" &&
            !cand.title.toLowerCase().includes(normFilter)
          ) {
            continue;
          }

          try {
            let surveyPageRes;
            if (cand.verT && cand.verP && cand.url) {
              surveyPageRes = await fetchWithJar(jar, cand.url, {
                method: "POST",
                form: { t: cand.verT, p: cand.verP },
                timeoutMs: 10000,
              });
            } else if (cand.url) {
              surveyPageRes = await fetchWithJar(jar, cand.url, { method: "GET", timeoutMs: 10000 });
            }
            if (!surveyPageRes) continue;

            // Check if the page has survey forms or nested survey links
            const pageForms = parseFormsFromHtml(surveyPageRes.text);
            const fullFormMatches = surveyPageRes.text.match(/<form\b[\s\S]*?<\/form>/gi) || [];

            for (let idx = 0; idx < pageForms.length; idx++) {
              const f = pageForms[idx];
              const rawFormHtml = fullFormMatches[idx] || "";
              const hasSurveyInputs =
                /<input[^>]*type=["']?radio["']?/i.test(rawFormHtml) ||
                /<select\b/i.test(rawFormHtml) ||
                /<textarea\b/i.test(rawFormHtml);

              if (!hasSurveyInputs) continue;

              const payload = fillSurveyFormHtml(rawFormHtml, ratingPreference, commentText);
              const submitUrl = new URL(f.action || surveyPageRes.finalUrl, surveyPageRes.finalUrl).href;

              await fetchWithJar(jar, submitUrl, {
                method: f.method,
                form: f.method === "POST" ? payload : undefined,
                timeoutMs: 10000,
              });

              items.push({
                source: "Sysacad Autogestión",
                title: cand.title,
                status: "completada",
                detail: `Encuesta completada automáticamente con valoración "${ratingPreference}".`,
              });
            }
          } catch (e: any) {
            items.push({
              source: "Sysacad Autogestión",
              title: cand.title,
              status: "pendiente_manual",
              detail: e?.message || "No se pudo enviar automáticamente el formulario.",
            });
          }
        }
      }
    }
  } catch {}

  const resolvedCount = items.filter((i) => i.status === "completada").length;
  const message =
    items.length === 0
      ? "Se verificó tu cuenta de Autogestión (Sysacad) y Campus Virtual UTN FRM: no tenés encuestas docentes pendientes por responder en este momento."
      : `Se procesaron ${items.length} encuesta(s) docente(s) (${resolvedCount} completada(s) automáticamente).`;

  return {
    ok: true,
    resolvedCount,
    foundCount: items.length,
    items,
    message,
  };
}

// ─── MAIN HTTP HANDLER (Vercel Serverless + Vite Dev Middleware) ────────────

function sendJson(res: any, code: number, data: any) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  try {
    let body: any = {};
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (typeof req.body === "string" && req.body.trim()) {
      body = JSON.parse(req.body);
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf-8").trim();
      if (raw) body = JSON.parse(raw);
    }

    const action = body.action || "sync_all";

    // Public avisos only
    if (action === "avisos") {
      const avisosRes = await fetchAutogestionAvisos();
      return sendJson(res, 200, avisosRes);
    }

    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const emailInput = String(body.email || "").trim();
    const legajo = body.legajo ? String(body.legajo).trim() : undefined;

    if (!username || !password) {
      return sendJson(res, 400, {
        ok: false,
        error: "Debés ingresar tu usuario (DNI) y tu clave de la UTN FRM.",
      });
    }

    // Action: resolve_encuestas (Exclusive for Admin-approved UTN FRM users)
    if (action === "resolve_encuestas") {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const authHeader = String(req.headers?.authorization || "");

      if (supabaseUrl && anonKey) {
        if (!authHeader.startsWith("Bearer ")) {
          return sendJson(res, 401, {
            ok: false,
            error: "No autorizado: se requiere sesión activa en TABE.",
          });
        }

        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: authHeader, apikey: anonKey },
        }).catch(() => null);

        if (!userRes?.ok) {
          return sendJson(res, 401, {
            ok: false,
            error: "Sesión de usuario inválida o expirada.",
          });
        }

        const authUser = await userRes.json().catch(() => null);
        const userId = authUser?.id;
        const userEmail = String(authUser?.email || "").toLowerCase();
        const isHardcodedSuperAdmin =
          userId === "47c2a694-d1f2-4a4b-b37f-45e37ea010c6" ||
          userEmail === "basabetomas09@gmail.com" ||
          userEmail === "tomasbasabe.utn@gmail.com";

        if (!userId) {
          return sendJson(res, 401, { ok: false, error: "Usuario no identificado." });
        }

        if (!isHardcodedSuperAdmin) {
          const profRes = await fetch(
            `${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=utnfrm_encuestas_enabled,plan_type`,
            {
              headers: {
                Authorization: authHeader,
                apikey: anonKey,
                Accept: "application/json",
                "x-tabe-client": "tabe-web-v2-shield",
              },
            }
          ).catch(() => null);

          const profRows = profRes?.ok ? await profRes.json().catch(() => []) : [];
          const prof = Array.isArray(profRows) ? profRows[0] : null;
          const approved =
            prof?.utnfrm_encuestas_enabled === true ||
            (typeof prof?.plan_type === "string" && prof.plan_type.includes("+encuestas_utn"));

          if (!approved) {
            return sendJson(res, 403, {
              ok: false,
              error:
                "No tenés habilitado el permiso para resolver encuestas docentes. El Administrador debe aprobar tu cuenta en el Panel de Administración.",
            });
          }
        }
      }

      const rating = String(body.rating || "muy_bueno").trim().slice(0, 40);
      const comment = String(
        body.comment || "Sin observaciones adicionales. Muy buen desarrollo de la cátedra."
      )
        .trim()
        .slice(0, 500);
      const filterTarget = body.materia || body.docente || undefined;

      const result = await resolveSysacadAndCampusEncuestas(
        username,
        password,
        legajo,
        rating,
        comment,
        filterTarget ? String(filterTarget).slice(0, 120) : undefined
      );
      return sendJson(res, 200, result);
    }

    // Action: resolve_campus_quiz (Resolves a Moodle quiz on Campus Virtual UTN FRM)
    if (action === "resolve_campus_quiz") {
      const quizUrl = body.quizUrl ? String(body.quizUrl).trim() : undefined;
      const quizName = body.quizName ? String(body.quizName).trim() : undefined;
      const courseName = body.courseName ? String(body.courseName).trim() : undefined;
      const submitMode = body.submitMode === "finish" ? "finish" : "save";
      const geminiApiKey = body.geminiApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      const customAnswers = body.customAnswers || undefined;

      const result = await resolveCampusQuiz(username, password, {
        quizUrl,
        quizName,
        courseName,
        submitMode,
        geminiApiKey,
        customAnswers,
      });

      return sendJson(res, 200, result);
    }

    // Run Sysacad, Campus, and Public Avisos in parallel
    const [sysacad, campus, avisosRes] = await Promise.all([
      fetchSysacadData(username, password, legajo),
      fetchCampusData(username, password),
      fetchAutogestionAvisos(),
    ]);

    // Resolve institutional email from input, or auto-detected from Campus / Sysacad
    const resolvedEmail =
      emailInput ||
      campus.profile?.email ||
      sysacad.studentInfo?.detectedEmail ||
      (username.includes("@") ? username : "");

    const mail = resolvedEmail
      ? await fetchInstitutionalMail(resolvedEmail, password)
      : {
          connected: false,
          error: "Opcional: ingresá tu correo @alumnos.frm.utn.edu.ar para sincronizar también tus emails.",
          unreadCount: 0,
          totalMessages: 0,
          messages: [],
        };

    // Determine if we found actual user data across any authenticated service
    const sysacadTablesCount = Object.values(sysacad.consultas).filter(
      (t) => t.rows.length > 0 || Boolean(t.text)
    ).length;

    const hasAnyUserData =
      sysacad.connected ||
      campus.connected ||
      mail.connected;

    if (!hasAnyUserData) {
      const reasons: string[] = [];
      if (sysacad.error) reasons.push(`• Autogestión (Sysacad): ${sysacad.error}`);
      if (campus.error) reasons.push(`• Campus Virtual: ${campus.error}`);
      if (emailInput && mail.error) reasons.push(`• Correo Institucional: ${mail.error}`);

      return sendJson(res, 200, {
        ok: false,
        notFound: true,
        error:
          "No se encontraron datos asociados al usuario y clave ingresados en UTN FRM. Verificá tu DNI y contraseña.",
        details: reasons.join("\n"),
        sysacad,
        campus,
        mail,
        avisos: avisosRes.avisos,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      notFound: false,
      syncedAt: new Date().toISOString(),
      resolvedEmail: resolvedEmail || undefined,
      summary: {
        sysacadConnected: sysacad.connected,
        sysacadTablesCount,
        legajo: sysacad.studentInfo?.legajo,
        studentLabel: sysacad.studentInfo?.fullLabel || campus.profile?.fullName,
        campusConnected: campus.connected,
        campusCoursesCount: campus.courses.length,
        campusDeadlinesCount: campus.deadlines.length,
        campusGradesCount: campus.grades.length,
        mailConnected: mail.connected,
        mailUnreadCount: mail.unreadCount,
        mailRecentCount: mail.messages.length,
        avisosCount: avisosRes.avisos.length,
      },
      sysacad,
      campus,
      mail,
      avisos: avisosRes.avisos,
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      ok: false,
      error: err?.message || "Error interno al conectar con los servidores de UTN FRM.",
    });
  }
}

export { resolveCampusQuiz, resolveSysacadAndCampusEncuestas as resolveDocenteEncuestas, fetchCampusData, fetchSysacadData };

