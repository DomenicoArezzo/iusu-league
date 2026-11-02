import type { Match } from "./types";

/** Capienza di una partita se il database non la indica (le partite più vecchie). */
export const DEFAULT_CAPACITY = 10;
export const COURT_OPTIONS = ["Iusu", "Sporting", "Altro"] as const;
export type CourtOption = (typeof COURT_OPTIONS)[number];
export const MAX_LOCATION = 60;
export const MAX_INFO = 500;

export type SignupState = "aperta" | "completa" | "annullata" | "chiusa";

export const SIGNUP_STATE_LABEL: Record<SignupState, string> = {
  aperta: "Aperta",
  completa: "Completa",
  annullata: "Annullata",
  chiusa: "Iscrizioni chiuse",
};

type MatchLike = Pick<Match, "status" | "played_at"> & { capacity?: number | null };

export function capacityOf(m: { capacity?: number | null }): number {
  return m.capacity && m.capacity > 0 ? m.capacity : DEFAULT_CAPACITY;
}

/**
 * Stato delle iscrizioni: si ricava dal numero di iscritti, non è salvato.
 * "chiusa" = la partita non è più da giocare (già iniziata, in corso, conclusa...).
 */
export function signupState(m: MatchLike, taken: number, now: number = Date.now()): SignupState {
  if (m.status === "annullata") return "annullata";
  if (m.status !== "programmata" || new Date(m.played_at).getTime() <= now) return "chiusa";
  return taken >= capacityOf(m) ? "completa" : "aperta";
}

export function seatsLeft(m: { capacity?: number | null }, taken: number): number {
  return Math.max(0, capacityOf(m) - taken);
}

/** Le partite non hanno un titolo salvato: lo ricaviamo dal campo. */
export function matchTitle(m: Pick<Match, "location">): string {
  return `Partita a ${m.location.trim() || "Iusu"}`;
}

/* ------------------------------------------------------------------ */
/* Creazione partita                                                    */
/* ------------------------------------------------------------------ */

export interface NewMatchInput {
  date: string; // aaaa-mm-gg
  time: string; // hh:mm
  court: CourtOption;
  customCourt: string;
  info: string;
}

export type NewMatchResult =
  | { ok: true; playedAt: string; location: string; info: string | null }
  | { ok: false; error: string };

/** Controlli sul form prima di chiamare il database (che li ripete comunque). */
export function validateNewMatch(input: NewMatchInput, now: number = Date.now()): NewMatchResult {
  if (!input.date || !input.time) return { ok: false, error: "Scegli data e orario." };
  const when = new Date(`${input.date}T${input.time}`); // senza fuso: ora locale di chi compila
  if (Number.isNaN(when.getTime())) return { ok: false, error: "Data o orario non validi." };
  if (when.getTime() <= now) return { ok: false, error: "La partita deve essere in una data e un orario futuri." };

  let location: string = input.court;
  if (input.court === "Altro") {
    location = input.customCourt.trim().replace(/\s+/g, " ");
    if (!location) return { ok: false, error: "Scrivi il nome del campo." };
  }
  if (location.length > MAX_LOCATION) return { ok: false, error: `Il nome del campo è troppo lungo (massimo ${MAX_LOCATION} caratteri).` };

  const info = input.info.trim();
  if (info.length > MAX_INFO) return { ok: false, error: `Le informazioni sono troppo lunghe (massimo ${MAX_INFO} caratteri).` };

  return { ok: true, playedAt: when.toISOString(), location, info: info || null };
}

/* ------------------------------------------------------------------ */
/* Condivisione su WhatsApp                                             */
/* ------------------------------------------------------------------ */

export function shareMessage(
  m: Pick<Match, "location" | "played_at" | "status"> & { capacity?: number | null; info?: string | null },
  taken: number,
  url: string,
  opts: { timeZone?: string; now?: number } = {},
): string {
  const when = new Date(m.played_at);
  const day = when.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: opts.timeZone });
  const time = when.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: opts.timeZone });
  const state = signupState(m, taken, opts.now);
  const cap = capacityOf(m);
  const left = seatsLeft(m, taken);

  const seats =
    state === "annullata"
      ? "❌ Partita annullata"
      : state === "completa"
        ? `👥 ${taken}/${cap} iscritti · COMPLETA`
        : state === "chiusa"
          ? `👥 ${taken}/${cap} iscritti`
          : `👥 ${taken}/${cap} iscritti · ${left} ${left === 1 ? "posto libero" : "posti liberi"}`;

  const lines = [`⚽ ${matchTitle(m)}`, `📅 ${day}, ore ${time}`, `📍 ${m.location}`, seats];
  if (m.info?.trim()) lines.push(`ℹ️ ${m.info.trim()}`);
  lines.push(`👉 ${url}`);
  return lines.join("\n");
}

/** Link che apre WhatsApp (app su telefono, WhatsApp Web o app desktop sul computer) con il testo già scritto. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/* ------------------------------------------------------------------ */
/* Errori del database in italiano                                      */
/* ------------------------------------------------------------------ */

const ERRORS: [string, string][] = [
  ["NOT_AUTHENTICATED", "Accedi per continuare."],
  ["MATCH_FULL", "La partita è completa: non ci sono più posti."],
  ["ALREADY_JOINED", "Sei già iscritto a questa partita."],
  ["NOT_JOINED", "Non risulti iscritto a questa partita."],
  ["MATCH_CANCELLED", "Questa partita è stata annullata."],
  ["MATCH_CLOSED", "Le iscrizioni a questa partita sono chiuse."],
  ["MATCH_NOT_FOUND", "Partita non trovata."],
  ["INVALID_DATE", "Scegli una data e un orario futuri."],
  ["INVALID_LOCATION", `Il nome del campo non è valido (massimo ${MAX_LOCATION} caratteri).`],
  ["INVALID_INFO", `Le informazioni sono troppo lunghe (massimo ${MAX_INFO} caratteri).`],
  ["TOO_MANY_OPEN_MATCHES", "Hai già 5 partite in programma create da te: aspetta che se ne giochi una."],
];

export function signupErrorMessage(message: string): string {
  for (const [code, text] of ERRORS) if (message.includes(code)) return text;
  if (/could not find the function|schema cache|does not exist/i.test(message)) {
    return "Le iscrizioni non sono ancora attive: manca un aggiornamento del database.";
  }
  return message || "Qualcosa è andato storto. Riprova.";
}
