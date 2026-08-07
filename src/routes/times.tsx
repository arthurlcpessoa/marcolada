import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Palette, Plus, Shuffle, Star, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageHeader, TeamDot } from "@/components/marcolada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { newTeam, useStore } from "@/lib/store";
import { displayName } from "@/lib/stats";
import { TEAM_COLORS, type Player, type Team } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/times")({
  head: () => ({
    meta: [
      { title: "Times da marcolada — Marcolada Stats" },
      { name: "description", content: "Monte, sorteie e edite os times da marcolada antes de começar as partidas." },
      { property: "og:title", content: "Times da marcolada — Marcolada Stats" },
      { property: "og:description", content: "Distribua os jogadores, defina cores e capitães dos times." },
    ],
  }),
  component: TimesPage,
});

const DEFAULT_NAMES = ["Azulão", "Branco", "Celeste", "Marinho", "Time 5", "Time 6"];

function TimesPage() {
  const navigate = useNavigate();
  const { db, hydrated, activeMarcolada, updateMarcolada } = useStore();
  const [picked, setPicked] = useState<string | null>(null);

  if (hydrated && !activeMarcolada) {
    return (
      <main className="min-h-screen">
        <PageHeader title="Times" back="/" />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhuma marcolada em andamento"
            action={<Button onClick={() => navigate({ to: "/nova" })}>Nova marcolada</Button>}
          />
        </div>
      </main>
    );
  }

  const marcolada = activeMarcolada;
  if (!marcolada) return null;

  const players = marcolada.rosterIds
    .map((id) => db.players.find((p) => p.id === id))
    .filter(Boolean) as Player[];
  const assigned = new Set(marcolada.teams.flatMap((t) => t.playerIds));
  const pool = players.filter((p) => !assigned.has(p.id));

  const setTeams = (fn: (teams: Team[]) => Team[]) =>
    updateMarcolada(marcolada.id, (p) => ({ ...p, teams: fn(p.teams) }));

  const addTeam = () => {
    const idx = marcolada.teams.length;
    setTeams((t) => [
      ...t,
      newTeam(DEFAULT_NAMES[idx] ?? `Time ${idx + 1}`, TEAM_COLORS[idx % TEAM_COLORS.length]!.value),
    ]);
  };

  const movePlayer = (playerId: string, teamId: string | null) => {
    setTeams((teams) =>
      teams.map((t) => {
        const without = {
          ...t,
          playerIds: t.playerIds.filter((x) => x !== playerId),
          captainId: t.captainId === playerId && t.id !== teamId ? undefined : t.captainId,
        };
        return t.id === teamId ? { ...without, playerIds: [...without.playerIds, playerId] } : without;
      }),
    );
    setPicked(null);
  };

  const autoGenerate = () => {
    const count = Math.max(2, marcolada.teams.length || 2);
    const base: Team[] =
      marcolada.teams.length >= 2
        ? marcolada.teams.map((t) => ({ ...t, playerIds: [], captainId: undefined }))
        : Array.from({ length: count }, (_, i) =>
            newTeam(DEFAULT_NAMES[i] ?? `Time ${i + 1}`, TEAM_COLORS[i % TEAM_COLORS.length]!.value),
          );

    // Sorteio balanceado: embaralha, ordena por estrelas (desc) e distribui
    // sempre para o time com menor soma de habilidade (e menos jogadores).
    const ranked = [...players]
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    const buckets = base.map((t) => ({ team: t, sum: 0, size: 0 }));
    ranked.forEach((p) => {
      const target = buckets.reduce((best, b) =>
        b.size < best.size || (b.size === best.size && b.sum < best.sum) ? b : best,
      );
      target.team.playerIds.push(p.id);
      target.sum += p.rating ?? 0;
      target.size += 1;
    });

    setTeams(() => base);
    const totals = buckets.map((b) => b.sum);
    const diff = Math.max(...totals) - Math.min(...totals);
    toast.success("Times sorteados", {
      description:
        diff === 0
          ? "Equipes com a mesma força em estrelas."
          : `Diferença de apenas ${diff.toFixed(0)} ${diff === 1 ? "estrela" : "estrelas"} entre os times.`,
    });
  };

  const ready = marcolada.teams.filter((t) => t.playerIds.length > 0).length >= 2;

  return (
    <main className="min-h-screen pb-28">
      <PageHeader
        title="Times"
        subtitle="Passo 3 de 3 · Escalações"
        back="/jogadores"
        action={
          <Button variant="secondary" className="h-10" onClick={autoGenerate}>
            <Shuffle className="h-4 w-4" /> Sortear
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <div className="surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Sem time ({pool.length})
            </h2>
            {picked ? (
              <button
                onClick={() => movePlayer(picked, null)}
                className="text-xs font-semibold text-primary"
              >
                Mover selecionado para cá
              </button>
            ) : null}
          </div>
          {pool.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todos os jogadores já estão escalados.</p>
          ) : (
            <div
              className="mt-3 flex flex-wrap gap-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => movePlayer(e.dataTransfer.getData("text/plain"), null)}
            >
              {pool.map((p) => (
                <PlayerChip
                  key={p.id}
                  player={p}
                  picked={picked === p.id}
                  onClick={() => setPicked(picked === p.id ? null : p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {marcolada.teams.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhum time criado"
            description="Crie os times manualmente ou use o sorteio automático."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={addTeam}>Criar time</Button>
                <Button variant="secondary" onClick={autoGenerate}>
                  Sortear times
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {marcolada.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                players={
                  team.playerIds
                    .map((id) => db.players.find((p) => p.id === id))
                    .filter(Boolean) as Player[]
                }
                picked={picked}
                onPick={setPicked}
                onDrop={(pid) => movePlayer(pid, team.id)}
                onChange={(patch) =>
                  setTeams((ts) => ts.map((t) => (t.id === team.id ? { ...t, ...patch } : t)))
                }
                onRemove={() => {
                  setTeams((ts) => ts.filter((t) => t.id !== team.id));
                  toast.success("Time removido");
                }}
              />
            ))}
          </div>
        )}

        {marcolada.teams.length > 0 ? (
          <Button variant="secondary" className="h-12 w-full" onClick={addTeam}>
            <Plus className="h-4 w-4" /> Adicionar time
          </Button>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Toque em um jogador e depois no time de destino, ou arraste no computador. As estatísticas
          continuam ligadas ao jogador mesmo se ele trocar de time.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Button
            size="lg"
            className="h-13 w-full text-base font-semibold"
            disabled={!ready}
            onClick={() => navigate({ to: "/partida" })}
          >
            {ready ? "Ir para as partidas" : "Monte pelo menos 2 times"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function PlayerChip({
  player,
  picked,
  onClick,
  captain,
}: {
  player: Player;
  picked: boolean;
  onClick: () => void;
  captain?: boolean;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", player.id)}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-semibold transition-colors",
        picked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
      )}
    >
      <Avatar player={player} size={26} />
      <span className="truncate">{displayName(player)}</span>
      {captain ? <Crown className="h-3.5 w-3.5 shrink-0 text-gold" /> : null}
    </button>
  );
}

function TeamCard({
  team,
  players,
  picked,
  onPick,
  onDrop,
  onChange,
  onRemove,
}: {
  team: Team;
  players: Player[];
  picked: string | null;
  onPick: (id: string | null) => void;
  onDrop: (playerId: string) => void;
  onChange: (patch: Partial<Team>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="surface flex flex-col gap-3 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e.dataTransfer.getData("text/plain"))}
      onClick={() => {
        if (picked) onDrop(picked);
      }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="grid h-9 w-9 place-items-center rounded-full border border-border"
              aria-label="Cor do time"
            >
              <TeamDot color={team.color} className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> Cor do time
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ color: c.value })}
                  className={cn(
                    "h-9 rounded-lg ring-offset-2 transition-transform hover:scale-105",
                    team.color === c.value && "ring-2 ring-primary",
                  )}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={team.name}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-9 border-transparent bg-transparent px-1 font-display text-base font-bold shadow-none focus-visible:border-input"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-destructive"
          aria-label="Remover time"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>
          {players.length} {players.length === 1 ? "jogador" : "jogadores"}
        </span>
        <span className="inline-flex items-center gap-1 tabular">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {players.reduce((sum, p) => sum + (p.rating ?? 0), 0)} estrelas
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Toque em um jogador da lista e depois aqui para escalar.
          </p>
        ) : (
          players.map((p) => (
            <span key={p.id} onClick={(e) => e.stopPropagation()}>
              <PlayerChip
                player={p}
                picked={picked === p.id}
                captain={team.captainId === p.id}
                onClick={() => onPick(picked === p.id ? null : p.id)}
              />
            </span>
          ))
        )}
      </div>

      {players.length > 0 ? (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <Crown className="h-3.5 w-3.5 shrink-0 text-gold" />
          <select
            value={team.captainId ?? ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChange({ captainId: e.target.value || undefined })}
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-muted-foreground outline-none"
          >
            <option value="">Sem capitão</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {displayName(p)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
