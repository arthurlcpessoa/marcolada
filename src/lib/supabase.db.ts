import { isSupabaseConfigured, supabase } from "./supabase";
import type { DB, GoalEvent, Marcolada, Match, Player, Team } from "./types";

const TABLES = {
  players: "players",
  marcoladas: "marcoladas",
  marcoladaPlayers: "marcolada_players",
  teams: "teams",
  teamPlayers: "team_players",
  matches: "matches",
  matchLineups: "match_lineups",
  goals: "goals",
} as const;

type Row = Record<string, unknown>;

type NormalizedDB = {
  players: Row[];
  marcoladas: Row[];
  marcoladaPlayers: Row[];
  teams: Row[];
  teamPlayers: Row[];
  matches: Row[];
  matchLineups: Row[];
  goals: Row[];
};

const rowKey = {
  players: (r: Row) => String(r.id),
  marcoladas: (r: Row) => String(r.id),
  marcoladaPlayers: (r: Row) => `${r.marcolada_id}:${r.player_id}`,
  teams: (r: Row) => String(r.id),
  teamPlayers: (r: Row) => `${r.team_id}:${r.player_id}`,
  matches: (r: Row) => String(r.id),
  matchLineups: (r: Row) => `${r.match_id}:${r.team_id}:${r.player_id}`,
  goals: (r: Row) => String(r.id),
};

function normalize(db: DB): NormalizedDB {
  const out: NormalizedDB = {
    players: [],
    marcoladas: [],
    marcoladaPlayers: [],
    teams: [],
    teamPlayers: [],
    matches: [],
    matchLineups: [],
    goals: [],
  };

  for (const player of db.players) {
    out.players.push({
      id: player.id,
      name: player.name,
      nickname: player.nickname ?? null,
      photo: player.photo ?? null,
      position: player.position ?? null,
      number: player.number ?? null,
      rating: player.rating ?? 0,
    });
  }

  for (const marcolada of db.marcoladas) {
    out.marcoladas.push({
      id: marcolada.id,
      name: marcolada.name,
      date: marcolada.date,
      location: marcolada.location ?? null,
      duration: marcolada.duration ?? null,
      format: marcolada.format ?? null,
      game_limit: marcolada.limit ?? null,
      status: marcolada.status,
      created_at: marcolada.createdAt,
      ended_at: marcolada.endedAt ?? null,
    });

    for (const playerId of marcolada.rosterIds) {
      out.marcoladaPlayers.push({
        marcolada_id: marcolada.id,
        player_id: playerId,
      });
    }

    for (let teamIndex = 0; teamIndex < marcolada.teams.length; teamIndex += 1) {
      const team = marcolada.teams[teamIndex]!;

      out.teams.push({
        id: team.id,
        marcolada_id: marcolada.id,
        name: team.name,
        color: team.color,
        captain_id: team.captainId ?? null,
        sort_order: teamIndex,
      });

      for (const playerId of team.playerIds) {
        out.teamPlayers.push({
          team_id: team.id,
          player_id: playerId,
        });
      }
    }

    for (const match of marcolada.matches) {
      out.matches.push({
        id: match.id,
        marcolada_id: marcolada.id,
        number: match.number,
        team_a_id: match.teamAId,
        team_b_id: match.teamBId,
        status: match.status,
        adjust_a: match.adjust.a,
        adjust_b: match.adjust.b,
        started_at: match.startedAt,
        ended_at: match.endedAt ?? null,
        elapsed: match.elapsed,
        running_since: match.runningSince ?? null,
      });

      for (const [teamId, playerIds] of Object.entries(match.lineups)) {
        for (const playerId of playerIds) {
          out.matchLineups.push({
            match_id: match.id,
            team_id: teamId,
            player_id: playerId,
          });
        }
      }

      for (const goal of match.goals) {
        out.goals.push({
          id: goal.id,
          match_id: match.id,
          team_id: goal.teamId,
          scorer_id: goal.scorerId,
          assist_id: goal.assistId ?? null,
          own_goal: goal.ownGoal,
          minute: goal.minute,
          ts: goal.ts,
        });
      }
    }
  }

  return out;
}

function changedRows(
  prevRows: Row[],
  nextRows: Row[],
  keyFn: (row: Row) => string,
): { upsert: Row[]; remove: Row[] } {
  const prev = new Map(prevRows.map((r) => [keyFn(r), r]));
  const next = new Map(nextRows.map((r) => [keyFn(r), r]));

  const upsert: Row[] = [];
  const remove: Row[] = [];

  for (const [key, row] of next) {
    const old = prev.get(key);

    if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
      upsert.push(row);
    }
  }

  for (const [key, row] of prev) {
    if (!next.has(key)) {
      remove.push(row);
    }
  }

  return { upsert, remove };
}

async function upsertRows(
  table: string,
  rows: Row[],
  onConflict?: string,
) {
  if (!rows.length) return;

  const { error } = await supabase
    .from(table)
    .upsert(rows, onConflict ? { onConflict } : undefined);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function deleteRows(
  table: string,
  rows: Row[],
  primaryKey: string,
) {
  if (!rows.length) return;

  const ids = rows
    .map((r) => r[primaryKey])
    .filter((v) => v != null);

  if (!ids.length) return;

  const { error } = await supabase
    .from(table)
    .delete()
    .in(primaryKey, ids);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function deleteCompositeRows(
  table: string,
  rows: Row[],
  columns: string[],
) {
  for (const row of rows) {
    let query = supabase.from(table).delete();

    for (const column of columns) {
      query = query.eq(column, row[column]);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

export async function syncDBDiff(
  prevDB: DB,
  nextDB: DB,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const prev = normalize(prevDB);
  const next = normalize(nextDB);

  const d = {
    players: changedRows(prev.players, next.players, rowKey.players),
    marcoladas: changedRows(
      prev.marcoladas,
      next.marcoladas,
      rowKey.marcoladas,
    ),
    marcoladaPlayers: changedRows(
      prev.marcoladaPlayers,
      next.marcoladaPlayers,
      rowKey.marcoladaPlayers,
    ),
    teams: changedRows(prev.teams, next.teams, rowKey.teams),
    teamPlayers: changedRows(
      prev.teamPlayers,
      next.teamPlayers,
      rowKey.teamPlayers,
    ),
    matches: changedRows(prev.matches, next.matches, rowKey.matches),
    matchLineups: changedRows(
      prev.matchLineups,
      next.matchLineups,
      rowKey.matchLineups,
    ),
    goals: changedRows(prev.goals, next.goals, rowKey.goals),
  };

  // Exclusões: filhos antes dos pais.
  await deleteRows(TABLES.goals, d.goals.remove, "id");

  await deleteCompositeRows(
    TABLES.matchLineups,
    d.matchLineups.remove,
    ["match_id", "team_id", "player_id"],
  );

  await deleteRows(TABLES.matches, d.matches.remove, "id");

  await deleteCompositeRows(
    TABLES.teamPlayers,
    d.teamPlayers.remove,
    ["team_id", "player_id"],
  );

  await deleteRows(TABLES.teams, d.teams.remove, "id");

  await deleteCompositeRows(
    TABLES.marcoladaPlayers,
    d.marcoladaPlayers.remove,
    ["marcolada_id", "player_id"],
  );

  await deleteRows(
    TABLES.marcoladas,
    d.marcoladas.remove,
    "id",
  );

  await deleteRows(TABLES.players, d.players.remove, "id");

  // Upserts: pais antes dos filhos.
  await upsertRows(TABLES.players, d.players.upsert, "id");

  await upsertRows(
    TABLES.marcoladas,
    d.marcoladas.upsert,
    "id",
  );

  await upsertRows(
    TABLES.marcoladaPlayers,
    d.marcoladaPlayers.upsert,
    "marcolada_id,player_id",
  );

  await upsertRows(TABLES.teams, d.teams.upsert, "id");

  await upsertRows(
    TABLES.teamPlayers,
    d.teamPlayers.upsert,
    "team_id,player_id",
  );

  await upsertRows(TABLES.matches, d.matches.upsert, "id");

  await upsertRows(
    TABLES.matchLineups,
    d.matchLineups.upsert,
    "match_id,team_id,player_id",
  );

  await upsertRows(TABLES.goals, d.goals.upsert, "id");
}

function asNumber(
  value: unknown,
  fallback = 0,
): number {
  if (typeof value === "number") return value;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function loadDBFromSupabase(): Promise<DB> {
  if (!isSupabaseConfigured) {
    return { players: [], marcoladas: [] };
  }

  const [
    playersRes,
    marcoladasRes,
    rosterRes,
    teamsRes,
    teamPlayersRes,
    matchesRes,
    lineupsRes,
    goalsRes,
  ] = await Promise.all([
    supabase.from(TABLES.players).select("*"),
    supabase.from(TABLES.marcoladas).select("*"),
    supabase.from(TABLES.marcoladaPlayers).select("*"),
    supabase
      .from(TABLES.teams)
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from(TABLES.teamPlayers).select("*"),
    supabase
      .from(TABLES.matches)
      .select("*")
      .order("number", { ascending: true }),
    supabase.from(TABLES.matchLineups).select("*"),
    supabase
      .from(TABLES.goals)
      .select("*")
      .order("ts", { ascending: true }),
  ]);

  const error =
    playersRes.error ??
    marcoladasRes.error ??
    rosterRes.error ??
    teamsRes.error ??
    teamPlayersRes.error ??
    matchesRes.error ??
    lineupsRes.error ??
    goalsRes.error;

  if (error) throw error;

  const players: Player[] = (playersRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    nickname: r.nickname ?? undefined,
    photo: r.photo ?? undefined,
    position: r.position ?? undefined,
    number: r.number ?? undefined,
    rating: r.rating ?? 0,
  }));

  const teamsByMarcolada = new Map<string, Team[]>();

  for (const r of teamsRes.data ?? []) {
    const team: Team = {
      id: r.id,
      name: r.name,
      color: r.color,
      playerIds: (teamPlayersRes.data ?? [])
        .filter((p) => p.team_id === r.id)
        .map((p) => p.player_id),
      captainId: r.captain_id ?? undefined,
    };

    const arr = teamsByMarcolada.get(r.marcolada_id) ?? [];
    arr.push(team);
    teamsByMarcolada.set(r.marcolada_id, arr);
  }

  const matchesByMarcolada = new Map<string, Match[]>();

  for (const r of matchesRes.data ?? []) {
    const lineups: Record<string, string[]> = {};

    for (
      const l of (lineupsRes.data ?? []).filter(
        (x) => x.match_id === r.id,
      )
    ) {
      lineups[l.team_id] = [
        ...(lineups[l.team_id] ?? []),
        l.player_id,
      ];
    }

    const goals: GoalEvent[] = (goalsRes.data ?? [])
      .filter((g) => g.match_id === r.id)
      .map((g) => ({
        id: g.id,
        teamId: g.team_id,
        scorerId: g.scorer_id,
        assistId: g.assist_id,
        ownGoal: Boolean(g.own_goal),
        minute: asNumber(g.minute),
        ts: asNumber(g.ts),
      }));

    const match: Match = {
      id: r.id,
      number: asNumber(r.number),
      teamAId: r.team_a_id,
      teamBId: r.team_b_id,
      lineups,
      goals,
      adjust: {
        a: asNumber(r.adjust_a),
        b: asNumber(r.adjust_b),
      },
      status: r.status,
      startedAt: asNumber(r.started_at),
      endedAt:
        r.ended_at == null
          ? undefined
          : asNumber(r.ended_at),
      elapsed: asNumber(r.elapsed),
      runningSince:
        r.running_since == null
          ? undefined
          : asNumber(r.running_since),
    };

    const arr =
      matchesByMarcolada.get(r.marcolada_id) ?? [];

    arr.push(match);

    matchesByMarcolada.set(r.marcolada_id, arr);
  }

  const marcoladas: Marcolada[] = (
    marcoladasRes.data ?? []
  ).map((r) => ({
    id: r.id,
    name: r.name,
    date: r.date,
    location: r.location ?? undefined,
    duration: r.duration ?? undefined,
    format: r.format ?? undefined,
    limit: r.game_limit ?? undefined,
    status: r.status,
    rosterIds: (rosterRes.data ?? [])
      .filter((p) => p.marcolada_id === r.id)
      .map((p) => p.player_id),
    teams: teamsByMarcolada.get(r.id) ?? [],
    matches: matchesByMarcolada.get(r.id) ?? [],
    createdAt: asNumber(r.created_at),
    endedAt:
      r.ended_at == null
        ? undefined
        : asNumber(r.ended_at),
  }));

  marcoladas.sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  return { players, marcoladas };
}

export function hasData(db: DB): boolean {
  return (
    db.players.length > 0 ||
    db.marcoladas.length > 0
  );
}
