import { describe, expect, it } from "vitest";
import { buildNews } from "./news";
import type { Match, Player } from "./types";

const NOW = new Date("2026-11-02T10:00:00Z").getTime();

function match(over: Partial<Match> & { id: string; played_at: string }): Match {
  return {
    season_id: null, location: "Iusu", duration_min: 60, status: "conclusa",
    score_a: null, score_b: null, mvp_player_id: null, notes: null, ...over,
  };
}

function player(over: Partial<Player> & { id: string }): Player {
  return {
    first_name: "Mario", last_name: "Rossi", nickname: null, avatar_url: null, status: "attivo", preferred_role: "jolly",
    shooting: 5, passing: 5, dribbling: 5, pace: 5, defending: 5, physical: 5, technique: 5, vision: 5, saves: 5,
    initial_value: 25, created_at: "2026-01-01T00:00:00Z", ...over,
  };
}

describe("buildNews", () => {
  it("è vuota senza dati", () => {
    expect(buildNews([], [], NOW)).toEqual([]);
  });

  it("segnala partite annullate di recente e risultati in attesa di conferma", () => {
    const items = buildNews(
      [
        match({ id: "a", played_at: "2026-10-30T20:00:00Z", status: "annullata", notes: "Campo chiuso per pioggia" }),
        match({ id: "b", played_at: "2026-10-31T20:00:00Z", status: "da_confermare", score_a: 5, score_b: 3 }),
        match({ id: "old", played_at: "2026-08-01T20:00:00Z", status: "annullata" }),
      ],
      [],
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(["p-b", "c-a"]);
    expect(items[0].title).toContain("5–3");
    expect(items[1].text).toBe("Campo chiuso per pioggia");
  });

  it("mostra le note solo delle partite concluse di recente", () => {
    const items = buildNews(
      [
        match({ id: "n1", played_at: "2026-10-25T20:00:00Z", notes: "  Grande rimonta   nel finale " }),
        match({ id: "n2", played_at: "2026-08-25T20:00:00Z", notes: "troppo vecchia" }),
      ],
      [],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Grande rimonta nel finale");
  });

  it("non riempie di 'nuovi arrivi' una lega appena creata", () => {
    const players = [player({ id: "1", created_at: "2026-10-30T00:00:00Z" }), player({ id: "2", created_at: "2026-10-30T00:00:00Z" })];
    expect(buildNews([], players, NOW)).toEqual([]);
  });

  it("segnala i nuovi arrivi quando la lega ha già giocato", () => {
    const items = buildNews(
      [match({ id: "m", played_at: "2026-09-10T20:00:00Z" })],
      [player({ id: "new", nickname: "Gigi", created_at: "2026-10-28T00:00:00Z" }), player({ id: "old", created_at: "2026-09-01T00:00:00Z" })],
      NOW,
    );
    expect(items.map((i) => i.title)).toEqual(["Nuovo in lega: Gigi"]);
  });

  it("rispetta il limite", () => {
    const ms = Array.from({ length: 9 }, (_, i) => match({ id: `m${i}`, played_at: `2026-10-${10 + i}T20:00:00Z`, notes: `nota ${i}` }));
    expect(buildNews(ms, [], NOW, 3)).toHaveLength(3);
  });
});
