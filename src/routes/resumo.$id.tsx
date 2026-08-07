import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Handshake, Home, Share2, Target, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageHeader, TeamDot } from "@/components/marcolada";
import { PlayerRanking, TeamRanking } from "@/components/rankings";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { displayName, formatClock, matchScore, marcoladaTotals, playerStats, rankTeams, topBy } from "@/lib/stats";
import { shareSummary } from "@/lib/share";
import { cn } from "@/lib/utils";
import type { PlayerStat } from "@/lib/stats";

export const Route = createFileRoute("/resumo/$id")({
  head: () => ({
    meta: [
      { title: "Resumo da marcolada — Marcolada Stats" },
      { name: "description", content: "Premiação, rankings e todos os resultados da marcolada." },
      { property: "og:title", content: "Resumo da marcolada — Marcolada Stats" },
      { property: "og:description", content: "Artilheiro, garçom, melhor time e resultados completos da marcolada." },
    ],
  }),
  component: ResumoPage,
});

function ResumoPage() {
  const { id } = useParams({ from: "/resumo/$id" });
  const { db, hydrated, getMarcolada } = useStore();
  const [sharing, setSharing] = useState(false);
  const marcolada = getMarcolada(id);

  if (!marcolada) {
    return (
      <main className="min-h-screen">
        <PageHeader title="Resumo" back="/" />
        <div className="mx-auto max-w-3xl px-4 py-6">
          {hydrated ? (
            <EmptyState icon={<Trophy className="h-6 w-6" />} title="Marcolada não encontrada" />
          ) : null}
        </div>
      </main>
    );
  }

  const stats = playerStats([marcolada], db.players);
  const totals = marcoladaTotals(marcolada);
  const teams = rankTeams(marcolada);
  const finished = marcolada.matches.filter((m) => m.status === "finished");
  const withGoals = finished
    .map((m) => ({ m, s: matchScore(m) }))
    .map((x) => ({ ...x, total: x.s.a + x.s.b, diff: Math.abs(x.s.a - x.s.b) }));
  const maisGols = [...withGoals].sort((a, b) => b.total - a.total)[0];
  const goleada = [...withGoals].sort((a, b) => b.diff - a.diff)[0];

  const awards: { label: string; icon: React.ReactNode; stat?: PlayerStat | null; value: string; sub: string }[] = [
    { label: "Artilheiro", icon: <Target className="h-4 w-4" />, stat: topBy(stats, "goals"), value: "", sub: "gols" },
    { label: "Garçom", icon: <Handshake className="h-4 w-4" />, stat: topBy(stats, "assists"), value: "", sub: "assistências" },
    {
      label: "Participações em gols",
      icon: <Crown className="h-4 w-4" />,
      stat: topBy(stats, "participations"),
      value: "",
      sub: "G+A",
    },
  ];
  const nums = [topBy(stats, "goals")?.goals, topBy(stats, "assists")?.assists, topBy(stats, "participations")?.participations];

  const teamName = (tid: string) => marcolada.teams.find((t) => t.id === tid)?.name ?? "Time";

  return (
    <main className="min-h-screen pb-28">
      <PageHeader title="Resumo da marcolada" subtitle={marcolada.name} back="/" />

      <section className="hero-blue px-4 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase opacity-75">
            {marcolada.date.split("-").reverse().join("/")}
            {marcolada.location ? ` · ${marcolada.location}` : ""}
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{marcolada.name}</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { l: "Gols", v: totals.goals },
              { l: "Partidas", v: totals.matches },
              { l: "Média", v: totals.avg },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-white/12 py-3 backdrop-blur">
                <p className="font-display text-2xl font-extrabold tabular">{x.v}</p>
                <p className="text-[0.65rem] tracking-[0.12em] uppercase opacity-75">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {awards.map((aw, i) =>
            aw.stat ? (
              <div key={aw.label} className="surface flex flex-col items-center gap-2 p-5 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
                  {aw.icon}
                </span>
                <p className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  {aw.label}
                </p>
                <Avatar player={aw.stat.player} size={56} />
                <p className="truncate font-display text-base font-extrabold">
                  {displayName(aw.stat.player)}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {nums[i]} {aw.sub}
                </p>
              </div>
            ) : null,
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {teams[0] ? (
            <div className="surface flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-gold">
                <Trophy className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  Melhor time
                </p>
                <p className="flex items-center gap-2 truncate font-display font-extrabold">
                  <TeamDot color={teams[0].team.color} /> {teams[0].team.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {teams[0].wins}V · SG {teams[0].gd > 0 ? `+${teams[0].gd}` : teams[0].gd}
                </p>
              </div>
            </div>
          ) : null}
          {maisGols ? (
            <div className="surface flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <Zap className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  Partida com mais gols
                </p>
                <p className="truncate font-display font-extrabold">
                  {teamName(maisGols.m.teamAId)} {maisGols.s.a} x {maisGols.s.b} {teamName(maisGols.m.teamBId)}
                </p>
                <p className="text-xs text-muted-foreground">{maisGols.total} gols</p>
              </div>
            </div>
          ) : null}
          {goleada ? (
            <div className="surface flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <Target className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  Placar mais elástico
                </p>
                <p className="truncate font-display font-extrabold">
                  {teamName(goleada.m.teamAId)} {goleada.s.a} x {goleada.s.b} {teamName(goleada.m.teamBId)}
                </p>
                <p className="text-xs text-muted-foreground">diferença de {goleada.diff}</p>
              </div>
            </div>
          ) : null}
        </section>

        <Tabs defaultValue="jogadores">
          <TabsList className="w-full">
            <TabsTrigger value="jogadores" className="flex-1">
              Jogadores
            </TabsTrigger>
            <TabsTrigger value="times" className="flex-1">
              Times
            </TabsTrigger>
            <TabsTrigger value="partidas" className="flex-1">
              Partidas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="jogadores" className="mt-4">
            <PlayerRanking stats={stats} />
          </TabsContent>
          <TabsContent value="times" className="mt-4">
            <TeamRanking marcolada={marcolada} />
          </TabsContent>
          <TabsContent value="partidas" className="mt-4">
            {finished.length === 0 ? (
              <EmptyState title="Nenhuma partida registrada" />
            ) : (
              <ul className="space-y-2">
                {finished.map((m) => {
                  const { a, b } = matchScore(m);
                  return (
                    <li key={m.id} className="surface p-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                        <span className={cn("truncate text-sm font-semibold", a > b && "text-primary")}>
                          {teamName(m.teamAId)}
                        </span>
                        <span className="shrink-0 rounded-lg bg-accent px-3 py-1 font-display text-sm font-extrabold tabular text-accent-foreground">
                          {a} x {b}
                        </span>
                        <span className={cn("truncate text-right text-sm font-semibold", b > a && "text-primary")}>
                          {teamName(m.teamBId)}
                        </span>
                      </div>
                      <p className="mt-1 text-center text-[0.7rem] text-muted-foreground">
                        Partida {m.number} · {formatClock(m.elapsed)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Duração total registrada: {formatClock(totals.duration)} · {totals.assists} assistências
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 space-y-2 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Link to="/" className="shrink-0">
            <Button variant="secondary" size="lg" className="h-13 w-13 p-0" aria-label="Início">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            size="lg"
            className="h-13 flex-1 text-base font-semibold"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              try {
                await shareSummary(marcolada, db.players);
              } catch {
                toast.error("Não foi possível gerar a imagem");
              } finally {
                setSharing(false);
              }
            }}
          >
            <Share2 className="h-5 w-5" /> {sharing ? "Gerando..." : "Compartilhar resumo"}
          </Button>
        </div>
      </div>
    </main>
  );
}
