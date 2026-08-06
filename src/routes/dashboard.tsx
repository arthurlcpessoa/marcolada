import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Play } from "lucide-react";
import { EmptyState, PageHeader, TeamDot } from "@/components/marcolada";
import { HighlightCards, PlayerRanking, TeamRanking } from "@/components/rankings";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { matchScore, playerStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard ao vivo — Marcolada Stats" },
      { name: "description", content: "Artilheiro, garçom, melhor time e rankings atualizados durante a pelada." },
      { property: "og:title", content: "Dashboard ao vivo — Marcolada Stats" },
      { property: "og:description", content: "Acompanhe os destaques da pelada em tempo real." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { db, hydrated, activePelada } = useStore();

  if (hydrated && !activePelada) {
    return (
      <main className="min-h-screen">
        <PageHeader title="Dashboard" back="/" />
        <div className="mx-auto max-w-4xl px-4 py-6">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="Nenhuma pelada em andamento"
            description="Comece uma pelada para acompanhar as estatísticas ao vivo."
            action={<Button onClick={() => navigate({ to: "/nova" })}>Nova pelada</Button>}
          />
        </div>
      </main>
    );
  }

  const pelada = activePelada;
  if (!pelada) return null;
  const stats = playerStats([pelada], db.players);
  const finished = pelada.matches.filter((m) => m.status === "finished");

  return (
    <main className="min-h-screen pb-28">
      <PageHeader title="Dashboard ao vivo" subtitle={pelada.name} back="/" />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-5">
        <HighlightCards pelada={pelada} players={db.players} />

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
            <TeamRanking pelada={pelada} />
          </TabsContent>
          <TabsContent value="partidas" className="mt-4">
            {finished.length === 0 ? (
              <EmptyState title="Nenhuma partida encerrada" description="Os resultados aparecem aqui." />
            ) : (
              <ul className="space-y-2">
                {finished.map((m) => {
                  const { a, b } = matchScore(m);
                  const ta = pelada.teams.find((t) => t.id === m.teamAId);
                  const tb = pelada.teams.find((t) => t.id === m.teamBId);
                  return (
                    <li
                      key={m.id}
                      className="surface grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 p-3"
                    >
                      <span className="shrink-0 text-xs font-bold text-muted-foreground tabular">
                        #{m.number}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <TeamDot color={ta?.color ?? "#999"} />
                        <span className={cn("truncate text-sm font-semibold", a > b && "text-primary")}>
                          {ta?.name}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-accent px-3 py-1 font-display text-sm font-extrabold tabular text-accent-foreground">
                        {a} x {b}
                      </span>
                      <span className="flex min-w-0 items-center justify-end gap-2">
                        <span className={cn("truncate text-sm font-semibold", b > a && "text-primary")}>
                          {tb?.name}
                        </span>
                        <TeamDot color={tb?.color ?? "#999"} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          <Link to="/partida">
            <Button size="lg" className="h-13 w-full text-base font-semibold">
              <Play className="h-5 w-5" /> Voltar para a partida
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
