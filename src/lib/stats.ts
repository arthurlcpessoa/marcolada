import type { Match, Pelada, Player, Team } from "./types";

export function matchScore(m: Match) {
  let a = m.adjust.a;
  let b = m.adjust.b;
  for (const g of m.goals) {
    // gol contra: creditado ao time adversário do jogador (já gravamos teamId como quem PONTUOU)
    if (g.teamId === m.teamAId) a++;
    else if (g.teamId === m.teamBId) b++;
  }
  return { a, b };
}

export type PlayerStat = {
  player: Player;
  goals: number;
  assists: number;
  participations: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winRate: number;
};

export type TeamStat = {
  team: Team;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  winRate: number;
};

const finished = (p: Pelada) => p.matches.filter((m) => m.status === "finished");

export function playerStats(peladas: Pelada[], players: Player[]): PlayerStat[] {
  const map = new Map<string, PlayerStat>();
  const get = (id: string) => {
    let s = map.get(id);
    if (!s) {
      const player = players.find((p) => p.id === id);
      if (!player) return null;
      s = {
        player,
        goals: 0,
        assists: 0,
        participations: 0,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        winRate: 0,
      };
      map.set(id, s);
    }
    return s;
  };

  for (const pelada of peladas) {
    for (const m of pelada.matches) {
      if (m.status !== "finished") continue;
      const { a, b } = matchScore(m);
      for (const teamId of [m.teamAId, m.teamBId]) {
        const isA = teamId === m.teamAId;
        const diff = isA ? a - b : b - a;
        for (const pid of m.lineups[teamId] ?? []) {
          const s = get(pid);
          if (!s) continue;
          s.matches++;
          if (diff > 0) s.wins++;
          else if (diff === 0) s.draws++;
          else s.losses++;
        }
      }
      for (const g of m.goals) {
        if (g.scorerId && !g.ownGoal) {
          const s = get(g.scorerId);
          if (s) s.goals++;
        }
        if (g.assistId) {
          const s = get(g.assistId);
          if (s) s.assists++;
        }
      }
    }
  }

  for (const s of map.values()) {
    s.participations = s.goals + s.assists;
    s.points = s.wins * 3 + s.draws;
    s.winRate = s.matches ? Math.round((s.points / (s.matches * 3)) * 100) : 0;
  }
  return [...map.values()];
}

export function teamStats(pelada: Pelada): TeamStat[] {
  const stats = new Map<string, TeamStat>();
  const get = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      const team = pelada.teams.find((t) => t.id === id);
      if (!team) return null;
      s = { team, games: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, winRate: 0 };
      stats.set(id, s);
    }
    return s;
  };

  for (const m of finished(pelada)) {
    const { a, b } = matchScore(m);
    const sa = get(m.teamAId);
    const sb = get(m.teamBId);
    if (!sa || !sb) continue;
    sa.games++;
    sb.games++;
    sa.gf += a;
    sa.ga += b;
    sb.gf += b;
    sb.ga += a;
    if (a > b) {
      sa.wins++;
      sb.losses++;
    } else if (b > a) {
      sb.wins++;
      sa.losses++;
    } else {
      sa.draws++;
      sb.draws++;
    }
  }

  for (const s of stats.values()) {
    s.gd = s.gf - s.ga;
    s.winRate = s.games ? Math.round(((s.wins * 3 + s.draws) / (s.games * 3)) * 100) : 0;
  }
  return [...stats.values()];
}

function headToHead(pelada: Pelada, aId: string, bId: string) {
  let aPts = 0;
  let bPts = 0;
  for (const m of finished(pelada)) {
    const ids = [m.teamAId, m.teamBId];
    if (!ids.includes(aId) || !ids.includes(bId)) continue;
    const { a, b } = matchScore(m);
    const aScore = m.teamAId === aId ? a : b;
    const bScore = m.teamAId === bId ? a : b;
    if (aScore > bScore) aPts += 3;
    else if (bScore > aScore) bPts += 3;
    else {
      aPts++;
      bPts++;
    }
  }
  return bPts - aPts;
}

export function rankTeams(pelada: Pelada): TeamStat[] {
  return teamStats(pelada).sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    const h2h = headToHead(pelada, x.team.id, y.team.id);
    if (h2h !== 0) return h2h;
    return x.ga - y.ga;
  });
}

export function peladaTotals(pelada: Pelada) {
  const fm = finished(pelada);
  let goals = 0;
  let assists = 0;
  for (const m of fm) {
    const { a, b } = matchScore(m);
    goals += a + b;
    assists += m.goals.filter((g) => g.assistId).length;
  }
  const duration = fm.reduce((acc, m) => acc + m.elapsed, 0);
  return {
    goals,
    assists,
    matches: fm.length,
    avg: fm.length ? (goals / fm.length).toFixed(1) : "0.0",
    duration,
  };
}

export function topBy(list: PlayerStat[], key: "goals" | "assists" | "participations") {
  const sorted = [...list].filter((s) => s[key] > 0).sort((a, b) => b[key] - a[key]);
  return sorted[0] ?? null;
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function initials(p: Player) {
  const base = p.nickname || p.name;
  return base
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function displayName(p: Player) {
  return p.nickname || p.name;
}
