import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, History, MapPin, Play, Plus, Target, Trophy, Users } from "lucide-react";
import { Logo, EmptyState, Avatar } from "@/components/marcolada";
import { useStore } from "@/lib/store";
import { displayName, playerStats, peladaTotals, topBy } from "@/lib/stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marcolada Stats — Estatísticas da pelada em tempo real" },
      {
        name: "description",
        content:
          "Registre gols, assistências, times e partidas da sua pelada e veja artilheiro, garçom e melhor time atualizados ao vivo.",
      },
      { property: "og:title", content: "Marcolada Stats — Estatísticas da pelada em tempo real" },
      {
        property: "og:description",
        content: "Gols, assistências e rankings da pelada entre amigos, atualizados em tempo real.",
      },
    ],
  }),
  component: Home,
});

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Home() {
  const { db, hydrated, activePelada } = useStore();
  const finished = db.peladas.filter((p) => p.status === "finished").sort((a, b) => b.createdAt - a.createdAt);
  const stats = playerStats(db.peladas, db.players);
  const artilheiro = topBy(stats, "goals");
  const garcom = topBy(stats, "assists");

  return (
    <main className="min-h-screen pb-16">
      <section className="hero-blue relative overflow-hidden px-4 pt-6 pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <Logo className="[&_span:last-child_span:last-child]:text-primary-foreground/70" />
            <Link
              to="/historico"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
            >
              <History className="h-3.5 w-3.5" /> Histórico
            </Link>
          </div>

          <div className="mt-10 max-w-xl">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase opacity-75">
              Pelada entre amigos
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight font-extrabold sm:text-4xl">
              Toda marcolada merece estatística de verdade.
            </h1>
            <p className="mt-3 text-sm opacity-85 sm:text-base">
              Monte os times, registre gols e assistências em poucos toques e descubra o artilheiro,
              o garçom e o melhor time do dia.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-5xl space-y-6 px-4">
        <div className="surface grid gap-3 p-4 sm:grid-cols-2">
          {hydrated && activePelada ? (
            <>
              <Link
                to="/partida"
                className="hero-blue flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-semibold transition-transform active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block truncate">Continuar pelada</span>
                  <span className="block truncate text-xs font-medium opacity-80">
                    {activePelada.name}
                  </span>
                </span>
                <Play className="h-5 w-5 shrink-0" />
              </Link>
              <Link
                to="/nova"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 font-semibold transition-colors hover:bg-accent"
              >
                Nova pelada <Plus className="h-5 w-5 shrink-0 text-primary" />
              </Link>
            </>
          ) : (
            <Link
              to="/nova"
              className="hero-blue flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-semibold transition-transform active:scale-[0.99] sm:col-span-2"
            >
              <span>
                <span className="block">Nova pelada</span>
                <span className="block text-xs font-medium opacity-80">
                  Comece agora e registre tudo ao vivo
                </span>
              </span>
              <Plus className="h-5 w-5 shrink-0" />
            </Link>
          )}
        </div>

        <section>
          <h2 className="mb-3 text-sm font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Recordes gerais
          </h2>
          {artilheiro || garcom ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Maior artilheiro", s: artilheiro, n: artilheiro?.goals, suffix: "gols", icon: <Target className="h-4 w-4" /> },
                { label: "Maior garçom", s: garcom, n: garcom?.assists, suffix: "assistências", icon: <Users className="h-4 w-4" /> },
              ].map((item) =>
                item.s ? (
                  <div key={item.label} className="surface flex items-center gap-3 p-4">
                    <Avatar player={item.s.player} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {item.label}
                      </p>
                      <p className="truncate font-display text-lg font-extrabold">
                        {displayName(item.s.player)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-2xl font-extrabold tabular text-primary">{item.n}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{item.suffix}</p>
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Trophy className="h-6 w-6" />}
              title="Sem recordes ainda"
              description="Assim que a primeira marcolada terminar, os destaques históricos aparecem aqui."
            />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Peladas anteriores
            </h2>
            {finished.length > 3 ? (
              <Link to="/historico" className="text-xs font-semibold text-primary">
                Ver todas
              </Link>
            ) : null}
          </div>
          {finished.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Nenhuma pelada encerrada"
              description="O histórico aparece aqui depois que você encerrar a primeira marcolada."
            />
          ) : (
            <ul className="space-y-3">
              {finished.slice(0, 3).map((p) => {
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
                        <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                          <span>{formatDate(p.date)}</span>
                          <span>{t.matches} partidas</span>
                          <span>{t.goals} gols</span>
                          {p.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {p.location}
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
      </div>
    </main>
  );
}
