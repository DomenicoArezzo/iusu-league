export type PlayerRole = "portiere" | "difensore" | "centrocampista" | "attaccante" | "jolly";
export type PlayerStatus = "attivo" | "inattivo" | "indisponibile";
export type MatchStatus = "programmata" | "in_corso" | "da_confermare" | "conclusa" | "annullata";
export type EventType = "goal" | "assist" | "own_goal" | "yellow" | "red";
export type TeamSide = "A" | "B" | "R";

export const SKILLS = [
  "shooting",
  "passing",
  "dribbling",
  "pace",
  "defending",
  "physical",
  "technique",
  "vision",
  "saves",
] as const;
export type Skill = (typeof SKILLS)[number];

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  avatar_url: string | null;
  status: PlayerStatus;
  preferred_role: PlayerRole;
  shooting: number;
  passing: number;
  dribbling: number;
  pace: number;
  defending: number;
  physical: number;
  technique: number;
  vision: number;
  saves: number;
  initial_value: number;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
}

export interface Match {
  id: string;
  season_id: string | null;
  played_at: string;
  location: string;
  duration_min: number;
  status: MatchStatus;
  score_a: number | null;
  score_b: number | null;
  mvp_player_id: string | null;
  notes: string | null;
  /** Posti totali per le iscrizioni (10). Le partite create prima della migrazione non lo hanno: vedi capacityOf(). */
  capacity?: number | null;
  /** Informazioni aggiuntive scritte da chi ha creato la partita. */
  info?: string | null;
  created_by?: string | null;
}

/** Iscrizione di un utente a una partita. Il nome è quello mostrato a tutti (mai l'email). */
export interface MatchSignup {
  id: string;
  match_id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  team: TeamSide;
  is_gk: boolean;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  type: EventType;
  minute: number | null;
}

export interface Availability {
  id: string;
  match_id: string;
  player_id: string;
  status: "yes" | "maybe" | "no";
}

export interface MarketAdjustment {
  id: string;
  player_id: string;
  delta: number;
  reason: string | null;
  created_at: string;
}

export interface ManualAward {
  id: string;
  season_id: string | null;
  award_key: string;
  player_id: string | null;
  note: string | null;
}

export interface PlayerRating {
  id: string;
  match_id: string;
  player_id: string;
  voter_id: string;
  score: number;
  comment: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "admin" | "member";
  player_id: string | null;
}

export interface Dataset {
  players: Player[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  events: MatchEvent[];
  adjustments: MarketAdjustment[];
}

export const TEAM_NAMES = { A: "Bianchi", B: "Neri" } as const;

export const STATUS_LABEL: Record<MatchStatus, string> = {
  programmata: "Programmata",
  in_corso: "In corso",
  da_confermare: "Da confermare",
  conclusa: "Conclusa",
  annullata: "Annullata",
};

export const ROLE_LABEL: Record<PlayerRole, string> = {
  portiere: "Portiere",
  difensore: "Difensore",
  centrocampista: "Centrocampista",
  attaccante: "Attaccante",
  jolly: "Jolly",
};

export const ROLE_SHORT: Record<PlayerRole, string> = {
  portiere: "POR",
  difensore: "DIF",
  centrocampista: "CEN",
  attaccante: "ATT",
  jolly: "JOL",
};

export const SKILL_LABEL: Record<Skill, string> = {
  shooting: "Tiro",
  passing: "Passaggio",
  dribbling: "Dribbling",
  pace: "Velocità",
  defending: "Difesa",
  physical: "Fisicità",
  technique: "Tecnica",
  vision: "Visione di gioco",
  saves: "Parate",
};

export function playerName(p: Pick<Player, "first_name" | "last_name" | "nickname">): string {
  return p.nickname?.trim() || `${p.first_name} ${p.last_name}`.trim();
}

export function playerFullName(p: Pick<Player, "first_name" | "last_name">): string {
  return `${p.first_name} ${p.last_name}`.trim();
}
