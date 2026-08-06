import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Search, Trophy } from "lucide-react";
import { Avatar, EmptyState, PageHeader } from "@/components/marcolada";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { displayName, peladaTotals, playerStats, rankTeams } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico da Marcolada — Marcolada Stats" },
      { name: "description", content: "Consulte peladas anteriores e os rankings históricos da turma." },
      { property: "og:title", content: "Histórico da Marcolada — Marcolada Stats" },
      { property: "og:description", content: "Maiores artilheiros, assistentes e times vencedores de todos os tempos." },
    ],
  }),
  component: HistoricoPage,
});

type HistSort = "goals" | "assists" | "matches" | "wins" | "winRate";

const TABS: { key: HistSort; label: string; suffix: string }[] = [
  { key: "goals", label: "Artilheiros", suffix: "gols" },
  { key: "assists", label: "Garçons", suffix: "assist." },
  { key: "matches", label: "Presenças", suffix: "jogos" },
  { key: "wins", label: "Vitórias", suffix: "vitórias" },
  { key: "winRate", label: "Aproveitamento", suffix: "%" },
];

function HistoricoPage() {
  const { db } = useStore();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");

  const past = db.peladas.filter((p) => p.status === "finished").sort((a, b) => b.createdAt - a.createdAt);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return past.filter((p) => {
      if (date && p.date !== date) return false;
      if (!q) return true;
      const inName = p.name.toLowerCase().includes(q);
      const inLocal = (p.location ?? "").toLowerCase().includes(q);
      const inTeam = p.teams.some((t) => t.name.toLowerCase().includes(q));
      const inPlayer = p.rosterIds.some((id) => {
        const pl = db.players.find((x) => x.id === id);
        return pl && (pl.name.toLowerCase().includes(q) || (pl.nickname ?? "").toLowerCase().includes(q));
      });
      return inName || inLocal || inTeam || inPlayer;
    });
  }, [past, query, date, db.players]);

  const stats = playerStats(past, db.players);
  const teamWins = useMemo(() => {
    const map = new Map<string, { name: string; color: string; wins: number }>();
    for (const p of past) {
      for (const t of rankTeams(p)) {
        const key = t.team.name.toLowerCase();
        const prev = map.get(key) ?? { name: t.team.name, color: t.team.color, wins: 0 };
        map.set(key, { ...prev, wins: prev.wins + t.wins });
      }
    }
    return [...map.values()].filter((t) => t.wins > 0).sort((a, b) => b.wins - a.wins);
  }, [past]);

  return (
    <main className="min-h-screen pb-12">
      <PageHeader title="Histórico" subtitle="Peladas e recordes de todos os tempos" back="/" />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-5">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por jogador, time ou local"
              className="h-12 pl-9"
            />
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 sm:w-44" />
        </div>

        <section>
          <h2 className="mb-3 text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Peladas ({filtered.length})
          </h2>
          {past.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Nenhuma pelada encerrada"
              description="Assim que você encerrar uma marcolada, ela fica guardada aqui."
            />
          ) : filtered.length === 0 ? (
            <EmptyState title="Nada encontrado" description="Ajuste os filtros para ver outras peladas." />
          ) : (
            <ul className="space-y-2">
              {filtered.map((p) => {
                const t = peladaTotals(p);
                return (
                  <li key={p.id}>
                    <Link
                      to="/resumo/$id"
                      params={{ id: p.id }}
                      className="surface flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                        <Trophy className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>{p.date.split("-").reverse().join("/")}</span>
                          <span>{t.matches} partidas</span>
                          <span>{t.goals} gols</span>
                          {p.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {p.location}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Rankings históricos
          </h2>
          {stats.length === 0 ? (
            <EmptyState title="Sem dados históricos" description="Encerre uma pelada para começar os recordes." />
          ) : (
            <Tabs defaultValue="goals">
              <TabsList className="w-full overflow-x-auto">
                {TABS.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="flex-1 text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TABS.map((t) => (
                <TabsContent key={t.key} value={t.key} className="mt-4">
                  <ul className="space-y-2">
                    {[...stats]
                      .filter((s) => s[t.key] > 0)
                      .sort((a, b) => b[t.key] - a[t.key])
                      .slice(0, 15)
                      .map((s, i) => (
                        <li key={s.player.id} className="surface flex items-center gap-3 p-3">
                          <span
                            className={cn(
                              "w-7 shrink-0 text-center font-display font-extrabold tabular",
                              i === 0 ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {i + 1}
                          </span>
                          <Avatar player={s.player} size={36} />
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {displayName(s.player)}
                          </span>
                          <span className="shrink-0 font-display font-extrabold tabular text-primary">
                            {s[t.key]}
                            {t.key === "winRate" ? "%" : ""}
                          </span>
                        </li>
                      ))}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>

        {teamWins.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Times com mais vitórias
            </h2>
            <ul className="space-y-2">
              {teamWins.slice(0, 10).map((t, i) => (
                <li key={t.name} className="surface flex items-center gap-3 p-3">
                  <span className="w-7 shrink-0 text-center font-display font-extrabold tabular text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
                  <span className="shrink-0 font-display font-extrabold tabular text-primary">{t.wins}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
