import type { ManualAward, Player } from "./types";
import type { MarketEntry } from "./market";
import type { PlayerStats } from "./stats";
import { recentForm } from "./stats";

export interface AwardDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  /** false = assegnato a mano dall'amministratore */
  auto: boolean;
  funny?: boolean;
}

export const AWARD_DEFS: AwardDef[] = [
  { key: "pallone_oro", title: "Pallone d'Oro di Iusu", description: "Miglior rendimento complessivo della stagione", icon: "🏆", auto: true },
  { key: "capocannoniere", title: "Capocannoniere", description: "Più gol in stagione", icon: "⚽", auto: true },
  { key: "assistman", title: "Miglior assistman", description: "Più assist in stagione", icon: "🎯", auto: true },
  { key: "portiere", title: "Miglior portiere", description: "Meno gol subiti a partita", icon: "🧤", auto: true },
  { key: "re_mvp", title: "Re degli MVP", description: "Più premi MVP", icon: "👑", auto: true },
  { key: "migliorato", title: "Più migliorato", description: "Maggior crescita di rendimento tra inizio e fine stagione", icon: "📈", auto: true },
  { key: "qualita_prezzo", title: "Miglior rapporto qualità/prezzo", description: "Alto rendimento, basso valore di mercato", icon: "💎", auto: true },
  { key: "flop", title: "Flop della stagione", description: "Rendimento più basso", icon: "📉", auto: true },
  { key: "fedelta", title: "Premio fedeltà", description: "Più presenze", icon: "🤝", auto: true },
  { key: "forma", title: "In forma", description: "Miglior rendimento nelle ultime 5 partite", icon: "🔥", auto: true },
  { key: "piede_banana", title: "Piede a banana", description: "Il tiro più storto della stagione", icon: "🍌", auto: false, funny: true },
  { key: "legno_oro", title: "Legno d'Oro", description: "Il più sfortunato davanti alla porta", icon: "🪵", auto: false, funny: true },
  { key: "assist_involontario", title: "Assist involontario", description: "Il passaggio più regalato agli avversari", icon: "🎁", auto: false, funny: true },
  { key: "peggior_errore", title: "Peggior errore della stagione", description: "L'errore che non dimenticheremo", icon: "🤦", auto: false, funny: true },
];

export interface AwardWinner {
  def: AwardDef;
  playerId: string | null;
  detail?: string;
  note?: string | null;
}

function best<T>(items: T[], score: (t: T) => number, dir: "max" | "min" = "max"): T | null {
  let winner: T | null = null;
  let bestScore = dir === "max" ? -Infinity : Infinity;
  for (const it of items) {
    const sc = score(it);
    if (dir === "max" ? sc > bestScore : sc < bestScore) {
      bestScore = sc;
      winner = it;
    }
  }
  return winner;
}

/** Miglioramento = media voti seconda metà − media prima metà (servono ≥4 presenze). */
function improvement(s: PlayerStats): number | null {
  if (s.lines.length < 4) return null;
  const half = Math.floor(s.lines.length / 2);
  const avg = (ls: PlayerStats["lines"]) => ls.reduce((a, l) => a + l.rating, 0) / ls.length;
  return avg(s.lines.slice(-half)) - avg(s.lines.slice(0, half));
}

export function computeAwards(
  players: Player[],
  seasonStats: Record<string, PlayerStats>,
  market: Record<string, MarketEntry>,
  manual: ManualAward[],
  minMatches: number,
): AwardWinner[] {
  const rows = players
    .map((p) => ({ p, s: seasonStats[p.id] }))
    .filter((r) => r.s && r.s.played > 0);
  const eligible = rows.filter((r) => r.s.played >= minMatches);
  const out: AwardWinner[] = [];

  for (const def of AWARD_DEFS) {
    let winnerId: string | null = null;
    let detail: string | undefined;
    let note: string | null | undefined;

    if (!def.auto) {
      const m = manual.find((x) => x.award_key === def.key);
      winnerId = m?.player_id ?? null;
      note = m?.note;
      out.push({ def, playerId: winnerId, note });
      continue;
    }

    switch (def.key) {
      case "pallone_oro": {
        const w = best(eligible, (r) => r.s.adjRating);
        if (w) (winnerId = w.p.id), (detail = `Rendimento ${w.s.adjRating.toFixed(2)}`);
        break;
      }
      case "capocannoniere": {
        const w = best(rows, (r) => r.s.goals + r.s.goalsPerGame / 100);
        if (w && w.s.goals > 0) (winnerId = w.p.id), (detail = `${w.s.goals} gol`);
        break;
      }
      case "assistman": {
        const w = best(rows, (r) => r.s.assists + r.s.assistsPerGame / 100);
        if (w && w.s.assists > 0) (winnerId = w.p.id), (detail = `${w.s.assists} assist`);
        break;
      }
      case "portiere": {
        const gk = rows.filter((r) => r.s.gkMatches >= Math.max(1, Math.min(minMatches, 3)));
        const w = best(gk, (r) => r.s.concededPerGame, "min");
        if (w) (winnerId = w.p.id), (detail = `${w.s.concededPerGame.toFixed(2)} gol subiti a partita`);
        break;
      }
      case "re_mvp": {
        const w = best(rows, (r) => r.s.mvps);
        if (w && w.s.mvps > 0) (winnerId = w.p.id), (detail = `${w.s.mvps} MVP`);
        break;
      }
      case "migliorato": {
        const cand = rows
          .map((r) => ({ r, imp: improvement(r.s) }))
          .filter((x): x is { r: (typeof rows)[number]; imp: number } => x.imp != null && x.imp > 0);
        const w = best(cand, (x) => x.imp);
        if (w) (winnerId = w.r.p.id), (detail = `+${w.imp.toFixed(2)} di voto medio`);
        break;
      }
      case "qualita_prezzo": {
        const w = best(eligible, (r) => r.s.adjRating / Math.max(1, market[r.p.id]?.current ?? 1));
        if (w) (winnerId = w.p.id), (detail = `Voto ${w.s.adjRating.toFixed(2)} · valore ${market[w.p.id]?.current ?? "?"}`);
        break;
      }
      case "flop": {
        const w = best(eligible, (r) => r.s.adjRating, "min");
        if (w && eligible.length > 1) (winnerId = w.p.id), (detail = `Rendimento ${w.s.adjRating.toFixed(2)}`);
        break;
      }
      case "fedelta": {
        const w = best(rows, (r) => r.s.played);
        if (w) (winnerId = w.p.id), (detail = `${w.s.played} presenze`);
        break;
      }
      case "forma": {
        const cand = rows
          .map((r) => ({ r, f: recentForm(r.s, 5) }))
          .filter((x): x is { r: (typeof rows)[number]; f: number } => x.f != null && x.r.s.played >= Math.min(3, minMatches));
        const w = best(cand, (x) => x.f);
        if (w) (winnerId = w.r.p.id), (detail = `Voto medio ${w.f.toFixed(2)} nelle ultime 5`);
        break;
      }
    }
    out.push({ def, playerId: winnerId, detail });
  }
  return out;
}
