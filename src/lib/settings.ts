export interface MarketParams {
  mvp: number;
  goal: number;
  assist: number;
  win: number;
  draw: number;
  loss: number;
  appearance: number;
  own_goal: number;
  yellow: number;
  red: number;
  /** quanto pesa il voto della partita: (voto - 6) * rating_factor */
  rating_factor: number;
  min_value: number;
}

export interface RatingParams {
  base: number;
  goal: number;
  assist: number;
  win: number;
  draw: number;
  loss: number;
  mvp: number;
  own_goal: number;
  yellow: number;
  red: number;
  clean_sheet: number;
}

export interface AlgoParams {
  /** partite minime per entrare nelle classifiche "a media" */
  min_matches: number;
  /** tolleranza: più è alta, più le squadre rigenerate cambiano */
  variety: number;
  /** peso del rendimento recente nella modalità competitiva (0-1) */
  form_weight: number;
  /** peso della % vittorie nella modalità competitiva (0-1) */
  winrate_weight: number;
  /** quante ultime partite contano come "rendimento recente" */
  form_matches: number;
}

export interface Settings {
  market: MarketParams;
  rating: RatingParams;
  algo: AlgoParams;
}

export const DEFAULT_MARKET: MarketParams = {
  mvp: 5,
  goal: 2,
  assist: 1,
  win: 2,
  draw: 0,
  loss: -1,
  appearance: 0.5,
  own_goal: -2,
  yellow: -0.5,
  red: -3,
  rating_factor: 1,
  min_value: 1,
};

export const DEFAULT_RATING: RatingParams = {
  base: 6,
  goal: 0.8,
  assist: 0.5,
  win: 0.5,
  draw: 0,
  loss: -0.3,
  mvp: 1,
  own_goal: -1,
  yellow: -0.2,
  red: -1.5,
  clean_sheet: 0.5,
};

export const DEFAULT_ALGO: AlgoParams = {
  min_matches: 3,
  variety: 1,
  form_weight: 0.3,
  winrate_weight: 0.2,
  form_matches: 5,
};

export const DEFAULT_SETTINGS: Settings = {
  market: DEFAULT_MARKET,
  rating: DEFAULT_RATING,
  algo: DEFAULT_ALGO,
};

export const SETTING_LABELS: Record<string, string> = {
  mvp: "MVP",
  goal: "Gol",
  assist: "Assist",
  win: "Vittoria",
  draw: "Pareggio",
  loss: "Sconfitta",
  appearance: "Presenza",
  own_goal: "Autogol",
  yellow: "Ammonizione",
  red: "Espulsione",
  rating_factor: "Peso del voto (voto − 6) ×",
  min_value: "Valore minimo",
  base: "Voto base",
  clean_sheet: "Porta inviolata (portiere)",
  min_matches: "Partite minime per le classifiche a media",
  variety: "Varietà nel rigenerare (0 = sempre la migliore)",
  form_weight: "Peso rendimento recente (0-1)",
  winrate_weight: "Peso % vittorie (0-1)",
  form_matches: "Ultime partite per il rendimento recente",
};

/** Unisce le righe della tabella settings ai valori di default. */
export function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const out: Settings = {
    market: { ...DEFAULT_MARKET },
    rating: { ...DEFAULT_RATING },
    algo: { ...DEFAULT_ALGO },
  };
  for (const row of rows) {
    if (row.key in out && row.value && typeof row.value === "object") {
      const target = out[row.key as keyof Settings] as unknown as Record<string, number>;
      for (const [k, v] of Object.entries(row.value as Record<string, unknown>)) {
        if (k in target && typeof v === "number" && Number.isFinite(v)) target[k] = v;
      }
    }
  }
  return out;
}
