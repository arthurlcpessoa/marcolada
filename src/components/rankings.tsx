import { useState } from "react";
import { Crown, Handshake, Target, Trophy } from "lucide-react";
import { Avatar, EmptyState, StatCard, TeamDot } from "@/components/marcolada";
import { displayName, marcoladaTotals, rankTeams, topBy, type PlayerStat } from "@/lib/stats";
import type { Marcolada, Player } from "@/lib/types";
import { playerStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

type SortKey = "goals" | "assists" | "participations" | "wins" | "winRate";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "goals", label: "Gols" },
  { key: "assists", label: "Assist." },
  { key: "participations", label: "Particip." },
  { key: "wins", label: "Vitórias" },
  { key: "winRate", label: "Aproveit." },
];

export function HighlightCards({ marcolada, players }: { marcolada: Marcolada; players: Player[] }) {
  const stats = playerStats([marcolada], players);
  const totals = marcoladaTotals(marcolada);
  const teams = rankTeams(marcolada);
  const artilheiro = topBy(stats, "goals");
  const garcom = topBy(stats, "assists");
  const participacoes = topBy(stats, "participations");
  const bestTeam = teams[0];
  const mostGoalsTeam = [...teams].sort((a, b) => b.gf - a.gf)[0];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        tone="blue"
        label="Artilheiro"
        icon={<Target className="h-4 w-4" />}
        value={artilheiro ? displayName(artilheiro.player) : "—"}
        hint={artilheiro ? `${artilheiro.goals} gols` : "sem gols ainda"}
      />
      <StatCard
        label="Garçom"
        icon={<Handshake className="h-4 w-4" />}
        value={garcom ? displayName(garcom.player) : "—"}
        hint={garcom ? `${garcom.assists} assistências` : "sem assistências"}
      />
      <StatCard
        label="Participações"
        icon={<Crown className="h-4 w-4" />}
        value={participacoes ? displayName(participacoes.player) : "—"}
        hint={participacoes ? `${participacoes.participations} G+A` : "—"}
      />
      <StatCard
        label="Time com mais vitórias"
        icon={<Trophy className="h-4 w-4" />}
        value={bestTeam ? bestTeam.team.name : "—"}
        hint={bestTeam ? `${bestTeam.wins} vitórias` : "—"}
      />
      <StatCard label="Time mais goleador" value={mostGoalsTeam ? mostGoalsTeam.team.name : "—"} hint={mostGoalsTeam ? `${mostGoalsTeam.gf} gols` : "—"} />
      <StatCard label="Total de gols" value={totals.goals} hint={`${totals.assists} assistências`} />
      <StatCard label="Partidas" value={totals.matches} hint="encerradas" />
      <StatCard label="Média de gols" value={totals.avg} hint="por partida" />
    </div>
  );
}

export function PlayerRanking({ stats }: { stats: PlayerStat[] }) {
  const [sort, setSort] = useState<SortKey>("goals");
  const rows = [...stats].sort((a, b) => b[sort] - a[sort] || b.goals - a.goals);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Ranking vazio"
        description="Os jogadores aparecem aqui assim que a primeira partida for encerrada."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
              sort === s.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-border text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Jogador</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">A</th>
              <th className="px-2 py-3 text-center">G+A</th>
              <th className="px-2 py-3 text-center">J</th>
              <th className="px-2 py-3 text-center">V</th>
              <th className="px-3 py-3 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.player.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-display text-sm font-bold tabular text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar player={s.player} size={30} />
                    <span className="truncate font-semibold">{displayName(s.player)}</span>
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center font-bold tabular text-primary">{s.goals}</td>
                <td className="px-2 py-2.5 text-center tabular">{s.assists}</td>
                <td className="px-2 py-2.5 text-center tabular">{s.participations}</td>
                <td className="px-2 py-2.5 text-center tabular text-muted-foreground">{s.matches}</td>
                <td className="px-2 py-2.5 text-center tabular">{s.wins}</td>
                <td className="px-3 py-2.5 text-center tabular text-muted-foreground">{s.winRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TeamRanking({ marcolada }: { marcolada: Marcolada }) {
  const rows = rankTeams(marcolada);
  if (rows.length === 0) {
    return <EmptyState title="Nenhum time classificado" description="Encerre uma partida para ver a tabela." />;
  }
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
            <th className="px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">Time</th>
            <th className="px-2 py-3 text-center">J</th>
            <th className="px-2 py-3 text-center">V</th>
            <th className="px-2 py-3 text-center">E</th>
            <th className="px-2 py-3 text-center">D</th>
            <th className="px-2 py-3 text-center">GP</th>
            <th className="px-2 py-3 text-center">GC</th>
            <th className="px-2 py-3 text-center">SG</th>
            <th className="px-3 py-3 text-center">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.team.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2.5 font-display font-bold tabular text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <TeamDot color={s.team.color} />
                  <span className="truncate font-semibold">{s.team.name}</span>
                </span>
              </td>
              <td className="px-2 py-2.5 text-center tabular">{s.games}</td>
              <td className="px-2 py-2.5 text-center font-bold tabular text-primary">{s.wins}</td>
              <td className="px-2 py-2.5 text-center tabular">{s.draws}</td>
              <td className="px-2 py-2.5 text-center tabular">{s.losses}</td>
              <td className="px-2 py-2.5 text-center tabular">{s.gf}</td>
              <td className="px-2 py-2.5 text-center tabular">{s.ga}</td>
              <td className="px-2 py-2.5 text-center tabular">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
              <td className="px-3 py-2.5 text-center tabular text-muted-foreground">{s.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
