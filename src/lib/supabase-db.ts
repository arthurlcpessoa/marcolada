import { supabase } from "./supabase";
import type { GoalEvent, Marcolada, Match, Player, Team, TeamMode } from "./types";

export async function loadPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[Marcolada] Erro ao carregar jogadores:", error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    nickname: row.nickname ?? undefined,
    photo: row.photo ?? undefined,
    position: row.position ?? undefined,
    number: row.number ?? undefined,
    rating: row.rating ?? 0,
  }));
}

export async function savePlayer(player: Player): Promise<void> {
  const { error } = await supabase
    .from("players")
    .upsert(
      {
        id: player.id,
        name: player.name,
        nickname: player.nickname ?? null,
        photo: player.photo ?? null,
        position: player.position ?? null,
        number: player.number ?? null,
        rating: player.rating ?? 0,
      },
      {
        onConflict: "id",
      },
    );

  if (error) {
    console.error("[Marcolada] Erro ao salvar jogador:", error);
    throw error;
  }
}

export async function updatePlayerRemote(player: Player): Promise<void> {
  await savePlayer(player);
}

export async function deletePlayerRemote(id: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Marcolada] Erro ao excluir jogador:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ *
 * Marcoladas (marcoladas + teams + matches + goals + tabelas de liga) *
 * ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;

function toMarcolada(
  row: Row,
  roster: Row[],
  teams: Row[],
  teamPlayers: Row[],
  matches: Row[],
  lineups: Row[],
  goals: Row[],
): Marcolada {
  const teamList: Team[] = teams
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      captainId: t.captain_id ?? undefined,
      playerIds: teamPlayers.filter((tp) => tp.team_id === t.id).map((tp) => tp.player_id),
    }));

  const matchList: Match[] = matches
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    .map((m) => {
      const lineup: Record<string, string[]> = {};
      lineups
        .filter((l) => l.match_id === m.id)
        .forEach((l) => {
          (lineup[l.team_id] ??= []).push(l.player_id);
        });

      const matchGoals: GoalEvent[] = goals
        .filter((g) => g.match_id === m.id)
        .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
        .map((g) => ({
          id: g.id,
          teamId: g.team_id,
          scorerId: g.scorer_id ?? null,
          assistId: g.assist_id ?? null,
          ownGoal: Boolean(g.own_goal),
          minute: g.minute ?? 0,
          ts: g.ts ?? 0,
        }));

      return {
        id: m.id,
        number: m.number,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        lineups: lineup,
        goals: matchGoals,
        adjust: { a: m.adjust_a ?? 0, b: m.adjust_b ?? 0 },
        status: m.status,
        startedAt: m.started_at ?? 0,
        endedAt: m.ended_at ?? undefined,
        elapsed: m.elapsed ?? 0,
        runningSince: m.running_since ?? null,
      };
    });

  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location ?? undefined,
    duration: row.duration ?? undefined,
    format: row.format ?? undefined,
    limit: row.game_limit ?? undefined,
    teamMode: (row.team_mode as TeamMode | null) ?? "fixed",
    status: row.status,
    rosterIds: roster.map((r) => r.player_id),
    teams: teamList,
    matches: matchList,
    createdAt: row.created_at ?? 0,
    endedAt: row.ended_at ?? undefined,
  };
}

export async function loadMarcoladas(): Promise<Marcolada[]> {
  const [m, roster, teams, teamPlayers, matches, lineups, goals] = await Promise.all([
    supabase.from("marcoladas").select("*"),
    supabase.from("marcolada_players").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("team_players").select("*"),
    supabase.from("matches").select("*"),
    supabase.from("match_lineups").select("*"),
    supabase.from("goals").select("*"),
  ]);

  const err = [m, roster, teams, teamPlayers, matches, lineups, goals].find((r) => r.error)?.error;
  if (err) {
    console.error("[Marcolada] Erro ao carregar marcoladas:", err);
    throw err;
  }

  const matchIdsByMarcolada = new Map<string, Set<string>>();
  (matches.data ?? []).forEach((mt: Row) => {
    const set = matchIdsByMarcolada.get(mt.marcolada_id) ?? new Set<string>();
    set.add(mt.id);
    matchIdsByMarcolada.set(mt.marcolada_id, set);
  });

  return (m.data ?? [])
    .map((row: Row) => {
      const teamRows = (teams.data ?? []).filter((t: Row) => t.marcolada_id === row.id);
      const teamIds = new Set(teamRows.map((t: Row) => t.id));
      const matchRows = (matches.data ?? []).filter((x: Row) => x.marcolada_id === row.id);
      const matchIds = new Set(matchRows.map((x: Row) => x.id));

      return toMarcolada(
        row,
        (roster.data ?? []).filter((r: Row) => r.marcolada_id === row.id),
        teamRows,
        (teamPlayers.data ?? []).filter((tp: Row) => teamIds.has(tp.team_id)),
        matchRows,
        (lineups.data ?? []).filter((l: Row) => matchIds.has(l.match_id)),
        (goals.data ?? []).filter((g: Row) => matchIds.has(g.match_id)),
      );
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

let teamModeSupported = true;

export async function saveMarcolada(m: Marcolada): Promise<void> {
  const base: Row = {
    id: m.id,
    name: m.name,
    date: m.date,
    location: m.location ?? null,
    duration: m.duration ?? null,
    format: m.format ?? null,
    game_limit: m.limit ?? null,
    status: m.status,
    created_at: m.createdAt,
    ended_at: m.endedAt ?? null,
  };

  const write = async (payload: Row) =>
    supabase.from("marcoladas").upsert(payload, { onConflict: "id" });

  let { error } = await write(
    teamModeSupported ? { ...base, team_mode: m.teamMode ?? "fixed" } : base,
  );

  if (error && teamModeSupported && /team_mode/.test(error.message ?? "")) {
    teamModeSupported = false;
    ({ error } = await write(base));
  }

  if (error) {
    console.error("[Marcolada] Erro ao salvar marcolada:", error);
    throw error;
  }

  // Substitui os filhos: apagar os times remove em cascata
  // team_players, matches, match_lineups e goals.
  await supabase.from("teams").delete().eq("marcolada_id", m.id);
  await supabase.from("marcolada_players").delete().eq("marcolada_id", m.id);

  if (m.rosterIds.length) {
    const { error: e } = await supabase
      .from("marcolada_players")
      .insert(m.rosterIds.map((player_id) => ({ marcolada_id: m.id, player_id })));
    if (e) throw e;
  }

  if (m.teams.length) {
    const { error: e } = await supabase.from("teams").insert(
      m.teams.map((t, i) => ({
        id: t.id,
        marcolada_id: m.id,
        name: t.name,
        color: t.color,
        captain_id: t.captainId ?? null,
        sort_order: i,
      })),
    );
    if (e) throw e;

    const tp = m.teams.flatMap((t) =>
      t.playerIds.map((player_id) => ({ team_id: t.id, player_id })),
    );
    if (tp.length) {
      const { error: e2 } = await supabase.from("team_players").insert(tp);
      if (e2) throw e2;
    }
  }

  if (m.matches.length) {
    const { error: e } = await supabase.from("matches").insert(
      m.matches.map((mt) => ({
        id: mt.id,
        marcolada_id: m.id,
        number: mt.number,
        team_a_id: mt.teamAId,
        team_b_id: mt.teamBId,
        status: mt.status,
        adjust_a: mt.adjust?.a ?? 0,
        adjust_b: mt.adjust?.b ?? 0,
        started_at: mt.startedAt,
        ended_at: mt.endedAt ?? null,
        elapsed: mt.elapsed ?? 0,
        running_since: mt.runningSince ?? null,
      })),
    );
    if (e) throw e;

    const lineups = m.matches.flatMap((mt) =>
      Object.entries(mt.lineups ?? {}).flatMap(([team_id, ids]) =>
        (ids ?? []).map((player_id) => ({ match_id: mt.id, team_id, player_id })),
      ),
    );
    if (lineups.length) {
      const { error: e2 } = await supabase.from("match_lineups").insert(lineups);
      if (e2) throw e2;
    }

    const goals = m.matches.flatMap((mt) =>
      (mt.goals ?? []).map((g) => ({
        id: g.id,
        match_id: mt.id,
        team_id: g.teamId,
        scorer_id: g.scorerId ?? null,
        assist_id: g.assistId ?? null,
        own_goal: g.ownGoal,
        minute: g.minute,
        ts: g.ts,
      })),
    );
    if (goals.length) {
      const { error: e3 } = await supabase.from("goals").insert(goals);
      if (e3) throw e3;
    }
  }
}

export async function deleteMarcoladaRemote(id: string): Promise<void> {
  const { error } = await supabase.from("marcoladas").delete().eq("id", id);
  if (error) {
    console.error("[Marcolada] Erro ao excluir marcolada:", error);
    throw error;
  }
}
