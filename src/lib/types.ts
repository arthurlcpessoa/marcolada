export type Player = {
  id: string;
  name: string;
  nickname?: string | undefined;
  photo?: string | undefined;
  position?: string | undefined;
  number?: string | undefined;
};

export type Team = {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
  captainId?: string | undefined;
};

export type GoalEvent = {
  id: string;
  teamId: string;
  scorerId: string | null;
  assistId?: string | null | undefined;
  ownGoal: boolean;
  minute: number;
  ts: number;
};

export type MatchStatus = "live" | "paused" | "finished";

export type Match = {
  id: string;
  number: number;
  teamAId: string;
  teamBId: string;
  lineups: Record<string, string[]>;
  goals: GoalEvent[];
  adjust: { a: number; b: number };
  status: MatchStatus;
  startedAt: number;
  endedAt?: number | undefined;
  elapsed: number;
  runningSince?: number | null | undefined;
};

export type Pelada = {
  id: string;
  name: string;
  date: string;
  location?: string | undefined;
  duration?: string | undefined;
  format?: string | undefined;
  limit?: string | undefined;
  status: "active" | "finished";
  rosterIds: string[];
  teams: Team[];
  matches: Match[];
  createdAt: number;
  endedAt?: number | undefined;
};

export type DB = {
  players: Player[];
  peladas: Pelada[];
};

export const emptyDB: DB = { players: [], peladas: [] };

export const TEAM_COLORS = [
  { name: "Azul", value: "#2563eb" },
  { name: "Marinho", value: "#0f2a5c" },
  { name: "Celeste", value: "#38bdf8" },
  { name: "Verde", value: "#16a34a" },
  { name: "Vermelho", value: "#dc2626" },
  { name: "Laranja", value: "#ea580c" },
  { name: "Preto", value: "#111827" },
  { name: "Branco", value: "#94a3b8" },
];
