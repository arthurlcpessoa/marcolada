import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  Flag,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Trophy,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageHeader, TeamDot } from "@/components/marcolada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { newMatch, uid, useStore } from "@/lib/store";
import { displayName, formatClock, matchScore } from "@/lib/stats";
import type { GoalEvent, Match, Marcolada, Player, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partida")({
  head: () => ({
    meta: [
      { title: "Partida ao vivo — Marcolada Stats" },
      { name: "description", content: "Placar ao vivo, registro de gols e assistências em poucos toques." },
      { property: "og:title", content: "Partida ao vivo — Marcolada Stats" },
      { property: "og:description", content: "Registre gols e assistências durante o jogo, sem formulário longo." },
    ],
  }),
  component: PartidaPage,
});

function PartidaPage() {
  const navigate = useNavigate();
  const { db, hydrated, activeMarcolada, updateMarcolada } = useStore();

  if (hydrated && !activeMarcolada) {
    return (
      <main className="min-h-screen">
        <PageHeader title="Partida" back="/" />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="Nenhuma marcolada em andamento"
            description="Crie uma marcolada para começar a registrar as partidas."
            action={<Button onClick={() => navigate({ to: "/nova" })}>Nova marcolada</Button>}
          />
        </div>
      </main>
    );
  }

  const marcolada = activeMarcolada;
  if (!marcolada) return null;

  const current = marcolada.matches.find((m) => m.status !== "finished");
  const getPlayer = (id: string | null | undefined) =>
    id ? db.players.find((p) => p.id === id) : undefined;

  if (!current) {
    return (
      <MatchSetup
        marcolada={marcolada}
        players={db.players}
        onStart={(a, b, lineups) =>
          updateMarcolada(marcolada.id, (p) => ({
            ...p,
            matches: [...p.matches, newMatch(p.matches.length + 1, a, b, lineups)],
          }))
        }
      />
    );
  }

  return <LiveMatch marcolada={marcolada} match={current} getPlayer={getPlayer} />;
}

function MatchSetup({
  marcolada,
  players,
  onStart,
}: {
  marcolada: Marcolada;
  players: Player[];
  onStart: (a: Team, b: Team, lineups?: { a: string[]; b: string[] }) => void;
}) {
  const navigate = useNavigate();
  const { updateMarcolada } = useStore();
  const teams = marcolada.teams.filter((t) => t.playerIds.length > 0);
  const last = [...marcolada.matches].reverse()[0];
  const [a, setA] = useState<string>(last?.teamAId ?? teams[0]?.id ?? "");
  const [b, setB] = useState<string>(last?.teamBId ?? teams[1]?.id ?? "");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const rotation = (marcolada.teamMode ?? "fixed") === "rotation";

  useEffect(() => {
    if (!a && teams[0]) setA(last?.teamAId ?? teams[0].id);
    if (!b && teams[1]) setB(last?.teamBId ?? teams[1].id);
  }, [a, b, teams, last]);

  const roster = useMemo(() => {
    const ids = marcolada.rosterIds.length
      ? marcolada.rosterIds
      : [...new Set(marcolada.teams.flatMap((t) => t.playerIds))];
    return ids.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  }, [marcolada.rosterIds, marcolada.teams, players]);

  const [assign, setAssign] = useState<Record<string, "a" | "b" | "out">>({});

  useEffect(() => {
    if (!rotation || !a || !b) return;
    const prevA = last ? (last.lineups[a] ?? null) : null;
    const prevB = last ? (last.lineups[b] ?? null) : null;
    const fallbackA = marcolada.teams.find((t) => t.id === a)?.playerIds ?? [];
    const fallbackB = marcolada.teams.find((t) => t.id === b)?.playerIds ?? [];
    const inA = new Set(prevA ?? fallbackA);
    const inB = new Set(prevB ?? fallbackB);
    const next: Record<string, "a" | "b" | "out"> = {};
    for (const p of roster) next[p.id] = inA.has(p.id) ? "a" : inB.has(p.id) ? "b" : "out";
    setAssign(next);
  }, [rotation, a, b, last, roster, marcolada.teams]);

  const countA = roster.filter((p) => assign[p.id] === "a").length;
  const countB = roster.filter((p) => assign[p.id] === "b").length;

  const teamA = teams.find((t) => t.id === a);
  const teamB = teams.find((t) => t.id === b);
  const played = marcolada.matches.filter((m) => m.status === "finished");
  const lineupsPayload = {
    a: roster.filter((p) => assign[p.id] === "a").map((p) => p.id),
    b: roster.filter((p) => assign[p.id] === "b").map((p) => p.id),
  };
  const canStart = !!teamA && !!teamB && a !== b && (!rotation || (countA > 0 && countB > 0));


  return (
    <main className="min-h-screen pb-28">
      <PageHeader
        title="Próxima partida"
        subtitle={marcolada.name}
        back="/"
        action={
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground"
          >
            <BarChart3 className="h-4 w-4" /> Ao vivo
          </Link>
        }
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {teams.length < 2 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Monte os times primeiro"
            description="É preciso ter pelo menos dois times com jogadores para iniciar uma partida."
            action={<Button onClick={() => navigate({ to: "/times" })}>Ir para os times</Button>}
          />
        ) : (
          <>
            <div className="surface space-y-4 p-4">
              <TeamPicker label="Mandante" teams={teams} value={a} exclude={b} onChange={setA} />
              <div className="text-center font-display text-sm font-bold text-muted-foreground">VS</div>
              <TeamPicker label="Visitante" teams={teams} value={b} exclude={a} onChange={setB} />
            </div>

            {rotation && teamA && teamB ? (
              <div className="surface space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
                    Escalação da partida
                  </h2>
                  <span className="text-xs text-muted-foreground tabular">
                    {countA} x {countB} · {roster.length - countA - countB} fora
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Toque para mover cada jogador. A escalação começa igual à da partida anterior.
                </p>
                <ul className="space-y-2">
                  {roster.map((p) => {
                    const value = assign[p.id] ?? "out";
                    const set = (v: "a" | "b" | "out") =>
                      setAssign((prev) => ({ ...prev, [p.id]: v }));
                    return (
                      <li key={p.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                        <Avatar player={p} size={28} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {displayName(p)}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          {(
                            [
                              { key: "a" as const, label: teamA.name, color: teamA.color },
                              { key: "out" as const, label: "Fora", color: null },
                              { key: "b" as const, label: teamB.name, color: teamB.color },
                            ]
                          ).map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => set(opt.key)}
                              className={cn(
                                "inline-flex max-w-[6.5rem] items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                                value === opt.key
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border",
                              )}
                            >
                              {opt.color ? <TeamDot color={opt.color} /> : null}
                              <span className="truncate">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <Button
              size="lg"
              className="h-14 w-full text-base font-semibold"
              disabled={!canStart}
              onClick={() =>
                teamA && teamB && onStart(teamA, teamB, rotation ? lineupsPayload : undefined)
              }
            >
              <Play className="h-5 w-5" /> Iniciar partida {marcolada.matches.length + 1}
            </Button>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" className="h-12" onClick={() => navigate({ to: "/times" })}>
                Editar escalações
              </Button>
              <Button variant="secondary" className="h-12" onClick={() => navigate({ to: "/dashboard" })}>
                Ver dashboard
              </Button>
            </div>
          </>
        )}

        {played.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Partidas de hoje
            </h2>
            <ul className="space-y-2">
              {played.map((m) => (
                <MatchRow key={m.id} marcolada={marcolada} match={m} />
              ))}
            </ul>
          </section>
        ) : null}

        <Button
          variant="ghost"
          className="h-12 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmEnd(true)}
        >
          <Flag className="h-4 w-4" /> Encerrar marcolada
        </Button>
      </div>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a marcolada?</AlertDialogTitle>
            <AlertDialogDescription>
              As estatísticas serão fechadas e você verá a tela de premiação. Não será possível
              registrar novas partidas nesta marcolada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateMarcolada(marcolada.id, (p) => ({ ...p, status: "finished", endedAt: Date.now() }));
                navigate({ to: "/resumo/$id", params: { id: marcolada.id } });
              }}
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function TeamPicker({
  label,
  teams,
  value,
  exclude,
  onChange,
}: {
  label: string;
  teams: Team[];
  value: string;
  exclude: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {teams.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.id === exclude}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-35",
              value === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            <TeamDot color={t.color} />
            {t.name}
            <span className="text-xs opacity-70">{t.playerIds.length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchRow({ marcolada, match }: { marcolada: Marcolada; match: Match }) {
  const { a, b } = matchScore(match);
  const ta = marcolada.teams.find((t) => t.id === match.teamAId);
  const tb = marcolada.teams.find((t) => t.id === match.teamBId);
  return (
    <li className="surface grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 p-3">
      <span className="flex min-w-0 items-center gap-2">
        <TeamDot color={ta?.color ?? "#999"} />
        <span className={cn("truncate text-sm font-semibold", a > b && "text-primary")}>{ta?.name}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-accent px-3 py-1 font-display text-sm font-extrabold tabular text-accent-foreground">
        {a} x {b}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className={cn("truncate text-sm font-semibold", b > a && "text-primary")}>{tb?.name}</span>
        <TeamDot color={tb?.color ?? "#999"} />
      </span>
    </li>
  );
}

function LiveMatch({
  marcolada,
  match,
  getPlayer,
}: {
  marcolada: Marcolada;
  match: Match;
  getPlayer: (id: string | null | undefined) => Player | undefined;
}) {
  const navigate = useNavigate();
  const { updateMarcolada, undo, canUndo } = useStore();
  const [, tick] = useState(0);
  const [goalOpen, setGoalOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [editing, setEditing] = useState<GoalEvent | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const teamA = marcolada.teams.find((t) => t.id === match.teamAId)!;
  const teamB = marcolada.teams.find((t) => t.id === match.teamBId)!;
  const { a, b } = matchScore(match);
  const running = match.status === "live" && match.runningSince;
  const seconds = match.elapsed + (running ? (Date.now() - match.runningSince!) / 1000 : 0);

  const patchMatch = (fn: (m: Match) => Match, label?: string) =>
    updateMarcolada(
      marcolada.id,
      (p) => ({ ...p, matches: p.matches.map((m) => (m.id === match.id ? fn(m) : m)) }),
      label,
    );

  const lineup = (teamId: string) =>
    (match.lineups[teamId] ?? []).map((id) => getPlayer(id)).filter(Boolean) as Player[];

  const toggleClock = () => {
    patchMatch((m) =>
      m.runningSince
        ? { ...m, elapsed: m.elapsed + (Date.now() - m.runningSince) / 1000, runningSince: null, status: "paused" }
        : { ...m, runningSince: Date.now(), status: "live" },
    );
  };

  const addGoal = (goal: Omit<GoalEvent, "id">) => {
    patchMatch((m) => ({ ...m, goals: [...m.goals, { ...goal, id: uid() }] }), "gol registrado");
    const scorer = getPlayer(goal.scorerId);
    toast.success(goal.ownGoal ? `Gol contra de ${scorer ? displayName(scorer) : "—"}` : `⚽ Gol de ${scorer ? displayName(scorer) : "—"}`, {
      description: goal.assistId
        ? `Assistência de ${displayName(getPlayer(goal.assistId)!)}`
        : "Sem assistência",
    });
  };

  const timeline = [...match.goals].sort((x, y) => x.minute - y.minute || x.ts - y.ts);

  return (
    <main className="min-h-screen pb-40">
      <PageHeader
        title={`Partida ${match.number}`}
        subtitle={marcolada.name}
        back="/"
        action={
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground"
          >
            <BarChart3 className="h-4 w-4" /> Ao vivo
          </Link>
        }
      />

      <section className="hero-blue px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-3 text-xs font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1 uppercase">
              {match.status === "live" ? "Em andamento" : "Pausada"}
            </span>
            <button
              onClick={toggleClock}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 tabular"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {formatClock(seconds)}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <div className="min-w-0 text-center">
              <TeamDot color={teamA.color} className="h-3.5 w-3.5" />
              <p className="truncate font-display text-base font-bold sm:text-lg">{teamA.name}</p>
            </div>
            <button
              onClick={() => setScoreOpen(true)}
              className="shrink-0 font-display text-5xl font-extrabold tabular sm:text-6xl"
              aria-label="Editar placar manualmente"
            >
              {a} <span className="opacity-50">:</span> {b}
            </button>
            <div className="min-w-0 text-center">
              <TeamDot color={teamB.color} className="h-3.5 w-3.5" />
              <p className="truncate font-display text-base font-bold sm:text-lg">{teamB.name}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <section>
          <h2 className="mb-2 text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Linha do tempo
          </h2>
          {timeline.length === 0 ? (
            <EmptyState title="Nenhum gol ainda" description="Toque em “Registrar gol” assim que a bola entrar." />
          ) : (
            <ul className="space-y-2">
              {timeline.map((g, i) => {
                const partial = timeline.slice(0, i + 1).reduce(
                  (acc, ev) => ({
                    a: acc.a + (ev.teamId === match.teamAId ? 1 : 0),
                    b: acc.b + (ev.teamId === match.teamBId ? 1 : 0),
                  }),
                  { a: match.adjust.a, b: match.adjust.b },
                );
                const team = g.teamId === teamA.id ? teamA : teamB;
                const scorer = getPlayer(g.scorerId);
                const assist = getPlayer(g.assistId);
                return (
                  <li key={g.id} className="surface flex items-center gap-3 p-3">
                    <span className="w-11 shrink-0 rounded-lg bg-accent py-1 text-center font-display text-xs font-bold tabular text-accent-foreground">
                      {g.minute}'
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <TeamDot color={team.color} />
                        <span className="truncate font-semibold">
                          {scorer ? displayName(scorer) : "Gol"}
                          {g.ownGoal ? " (contra)" : ""}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {assist ? `Assistência: ${displayName(assist)}` : "Sem assistência"} ·{" "}
                        {partial.a}x{partial.b}
                      </span>
                    </span>
                    <button
                      onClick={() => setEditing(g)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
                      aria-label="Editar lance"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        patchMatch((m) => ({ ...m, goals: m.goals.filter((x) => x.id !== g.id) }), "lance excluído");
                        toast.success("Lance excluído e estatísticas recalculadas");
                      }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Excluir lance"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {[teamA, teamB].map((t) => (
            <div key={t.id} className="surface p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <TeamDot color={t.color} /> {t.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lineup(t.id).map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pr-2.5 pl-1 text-xs font-semibold"
                  >
                    <Avatar player={p} size={20} /> {displayName(p)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 space-y-2 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-2">
          <Button size="lg" className="h-16 w-full text-lg font-bold" onClick={() => setGoalOpen(true)}>
            <Plus className="h-6 w-6" /> Registrar gol
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" className="h-12" disabled={!canUndo} onClick={undo}>
              <Undo2 className="h-4 w-4" /> Desfazer
            </Button>
            <Button variant="secondary" className="h-12" onClick={toggleClock}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pausar" : "Seguir"}
            </Button>
            <Button variant="secondary" className="h-12" onClick={() => setConfirmEnd(true)}>
              <Flag className="h-4 w-4" /> Encerrar
            </Button>
          </div>
        </div>
      </div>

      <GoalDialog
        open={goalOpen || editing !== null}
        editing={editing}
        teamA={teamA}
        teamB={teamB}
        lineupA={lineup(teamA.id)}
        lineupB={lineup(teamB.id)}
        currentMinute={Math.floor(seconds / 60)}
        onClose={() => {
          setGoalOpen(false);
          setEditing(null);
        }}
        onSave={(data) => {
          if (editing) {
            patchMatch(
              (m) => ({ ...m, goals: m.goals.map((g) => (g.id === editing.id ? { ...g, ...data } : g)) }),
              "lance editado",
            );
            toast.success("Lance atualizado");
          } else {
            addGoal(data);
          }
          setGoalOpen(false);
          setEditing(null);
        }}
      />

      <ScoreDialog
        open={scoreOpen}
        onOpenChange={setScoreOpen}
        a={a}
        b={b}
        onSave={(na, nb) => {
          patchMatch((m) => {
            const golsA = m.goals.filter((g) => g.teamId === m.teamAId).length;
            const golsB = m.goals.filter((g) => g.teamId === m.teamBId).length;
            return { ...m, adjust: { a: na - golsA, b: nb - golsB } };
          }, "placar ajustado");
          toast.success("Placar ajustado manualmente");
        }}
      />

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogTitle>Encerrar a partida {match.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            Placar final {a} x {b}. Os dados vão para o ranking da marcolada.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar jogando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                patchMatch((m) => ({
                  ...m,
                  status: "finished",
                  endedAt: Date.now(),
                  elapsed: m.elapsed + (m.runningSince ? (Date.now() - m.runningSince) / 1000 : 0),
                  runningSince: null,
                }));
                toast.success("Partida encerrada");
                navigate({ to: "/dashboard" });
              }}
            >
              Encerrar partida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </main>
  );
}

function ScoreDialog({
  open,
  onOpenChange,
  a,
  b,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  a: number;
  b: number;
  onSave: (a: number, b: number) => void;
}) {
  const [va, setVa] = useState(a);
  const [vb, setVb] = useState(b);
  useEffect(() => {
    if (open) {
      setVa(a);
      setVb(b);
    }
  }, [open, a, b]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar placar</DialogTitle>
          <DialogDescription>Use apenas para corrigir gols que não foram registrados.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {[
            { v: va, set: setVa },
            { v: vb, set: setVb },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
              <Button variant="secondary" size="icon" onClick={() => s.set(Math.max(0, s.v - 1))}>
                −
              </Button>
              <span className="font-display text-2xl font-extrabold tabular">{s.v}</span>
              <Button variant="secondary" size="icon" onClick={() => s.set(s.v + 1)}>
                +
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            className="h-12 w-full"
            onClick={() => {
              onSave(va, vb);
              onOpenChange(false);
            }}
          >
            Salvar placar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({
  open,
  editing,
  teamA,
  teamB,
  lineupA,
  lineupB,
  currentMinute,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: GoalEvent | null;
  teamA: Team;
  teamB: Team;
  lineupA: Player[];
  lineupB: Player[];
  currentMinute: number;
  onClose: () => void;
  onSave: (data: Omit<GoalEvent, "id">) => void;
}) {
  const [teamId, setTeamId] = useState(teamA.id);
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);
  const [ownGoal, setOwnGoal] = useState(false);
  const [minute, setMinute] = useState(currentMinute);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTeamId(editing.teamId);
      setScorerId(editing.scorerId);
      setAssistId(editing.assistId ?? null);
      setOwnGoal(editing.ownGoal);
      setMinute(editing.minute);
      setStep(1);
    } else {
      setTeamId(teamA.id);
      setScorerId(null);
      setAssistId(null);
      setOwnGoal(false);
      setMinute(currentMinute);
      setStep(0);
    }
  }, [open, editing, teamA.id, currentMinute]);

  const scoringTeam = teamId === teamA.id ? teamA : teamB;
  const scoringSquad = teamId === teamA.id ? lineupA : lineupB;
  const opponentSquad = teamId === teamA.id ? lineupB : lineupA;
  const scorerOptions = ownGoal ? opponentSquad : scoringSquad;
  const assistOptions = useMemo(
    () => scoringSquad.filter((p) => p.id !== scorerId),
    [scoringSquad, scorerId],
  );

  const confirm = () =>
    onSave({
      teamId,
      scorerId,
      assistId: ownGoal ? null : assistId,
      ownGoal,
      minute,
      ts: editing?.ts ?? Date.now(),
    });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Corrigir lance" : "Registrar gol"}</DialogTitle>
          <DialogDescription>
            {step === 0 ? "Quem marcou o ponto?" : "Escolha o autor e, se houver, o assistente."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 ? (
          <div className="grid gap-3">
            {[teamA, teamB].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTeamId(t.id);
                  setScorerId(null);
                  setAssistId(null);
                  setStep(1);
                }}
                className="flex items-center gap-3 rounded-2xl border border-border p-4 text-left font-display text-lg font-bold transition-colors hover:bg-accent"
              >
                <TeamDot color={t.color} className="h-4 w-4" />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
              <span className="flex min-w-0 items-center gap-2">
                <TeamDot color={scoringTeam.color} />
                <span className="truncate">Ponto para {scoringTeam.name}</span>
              </span>
              <button className="shrink-0 text-xs text-primary underline" onClick={() => setStep(0)}>
                trocar
              </button>
            </div>

            <div>
              <p className="mb-2 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Autor do gol
              </p>
              <div className="grid grid-cols-2 gap-2">
                {scorerOptions.map((p) => (
                  <SelectChip
                    key={p.id}
                    player={p}
                    active={scorerId === p.id}
                    onClick={() => {
                      setScorerId(p.id);
                      if (assistId === p.id) setAssistId(null);
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  setOwnGoal(!ownGoal);
                  setScorerId(null);
                  setAssistId(null);
                }}
                className={cn(
                  "mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                  ownGoal ? "border-destructive bg-destructive/10 text-destructive" : "border-border",
                )}
              >
                {ownGoal ? "Gol contra ativado — escolha o jogador adversário" : "Foi gol contra"}
              </button>
            </div>

            {!ownGoal ? (
              <div>
                <p className="mb-2 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Assistência (opcional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {assistOptions.map((p) => (
                    <SelectChip
                      key={p.id}
                      player={p}
                      active={assistId === p.id}
                      onClick={() => setAssistId(assistId === p.id ? null : p.id)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setAssistId(null)}
                  className={cn(
                    "mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                    assistId === null ? "border-primary bg-accent text-accent-foreground" : "border-border",
                  )}
                >
                  Gol sem assistência
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Minuto
              </p>
              <Input
                type="number"
                min={0}
                value={minute}
                onChange={(e) => setMinute(Math.max(0, Number(e.target.value)))}
                className="h-10 w-24"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:flex-row">
          <Button variant="secondary" className="h-12 flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="h-12 flex-1" disabled={step === 0 || !scorerId} onClick={confirm}>
            <Check className="h-4 w-4" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectChip({
  player,
  active,
  onClick,
}: {
  player: Player;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
      )}
    >
      <Avatar player={player} size={26} />
      <span className="truncate">{displayName(player)}</span>
    </button>
  );
}
