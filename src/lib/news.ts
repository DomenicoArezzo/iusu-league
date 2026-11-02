import type { Match, Player } from "./types";

export type NewsKind = "cancelled" | "pending" | "note" | "newPlayer";

export interface NewsItem {
  id: string;
  kind: NewsKind;
  /** ISO, usata per ordinare (la più recente per prima). */
  date: string;
  title: string;
  text?: string;
  href?: string;
}

const DAY = 24 * 3600_000;

function shorten(s: string, max = 140): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * "Novità dalla lega" ricavate dai dati che ci sono già (nessuna tabella in più):
 * partite annullate o in attesa di conferma, note lasciate sulle ultime partite, nuovi arrivi.
 * La prossima partita e l'ultimo risultato hanno già un loro riquadro nella home.
 */
export function buildNews(matches: Match[], players: Player[], now: number = Date.now(), limit = 5): NewsItem[] {
  const items: NewsItem[] = [];
  const fmtResult = (m: Match) => (m.score_a != null && m.score_b != null ? `${m.score_a}–${m.score_b}` : "");

  for (const m of matches) {
    const t = new Date(m.played_at).getTime();
    if (m.status === "annullata" && t > now - 14 * DAY) {
      items.push({ id: `c-${m.id}`, kind: "cancelled", date: m.played_at, title: "Partita annullata", text: m.notes ? shorten(m.notes) : undefined, href: `/partite/${m.id}` });
    } else if (m.status === "da_confermare") {
      const r = fmtResult(m);
      items.push({ id: `p-${m.id}`, kind: "pending", date: m.played_at, title: r ? `Risultato in attesa di conferma: ${r}` : "Risultato in attesa di conferma", href: `/partite/${m.id}` });
    } else if (m.status === "conclusa" && m.notes?.trim() && t > now - 30 * DAY) {
      items.push({ id: `n-${m.id}`, kind: "note", date: m.played_at, title: "Dalla partita", text: shorten(m.notes), href: `/partite/${m.id}` });
    }
  }

  // Nuovi arrivi: solo se la lega ha già giocato prima del loro ingresso (altrimenti, all'avvio, sarebbero tutti "nuovi").
  const firstPlayed = matches.filter((m) => m.status === "conclusa").map((m) => new Date(m.played_at).getTime()).sort((a, b) => a - b)[0];
  if (firstPlayed !== undefined) {
    for (const p of players) {
      const created = new Date(p.created_at).getTime();
      if (p.status === "attivo" && created > now - 30 * DAY && created > firstPlayed) {
        const name = p.nickname?.trim() || `${p.first_name} ${p.last_name}`.trim();
        items.push({ id: `u-${p.id}`, kind: "newPlayer", date: p.created_at, title: `Nuovo in lega: ${name}`, href: `/giocatori/${p.id}` });
      }
    }
  }

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
