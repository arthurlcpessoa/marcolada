import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageHeader } from "@/components/marcolada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { StarRating } from "@/components/star-rating";
import { PlayerFormDialog } from "@/components/player-form-dialog";
import { useStore } from "@/lib/store";
import { displayName } from "@/lib/stats";
import type { Player } from "@/lib/types";

export const Route = createFileRoute("/elenco")({
  head: () => ({
    meta: [
      { title: "Elenco — jogadores cadastrados | Marcolada Stats" },
      {
        name: "description",
        content:
          "Veja todos os jogadores cadastrados, edite nome, apelido, posição, foto e habilidade sem precisar abrir uma marcolada.",
      },
      { property: "og:title", content: "Elenco — jogadores cadastrados | Marcolada Stats" },
      {
        property: "og:description",
        content: "Cadastre, edite e organize os jogadores da turma a qualquer momento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ElencoPage,
});

function ElencoPage() {
  const { db, hydrated, addPlayer, updatePlayer, update } = useStore();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [removing, setRemoving] = useState<Player | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.players
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.nickname ?? "").toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.players, query]);

  const removeFromRegistry = (id: string) => {
    update((d) => ({
      ...d,
      players: d.players.filter((p) => p.id !== id),
      marcoladas: d.marcoladas.map((p) =>
        p.status === "active"
          ? {
              ...p,
              rosterIds: p.rosterIds.filter((x) => x !== id),
              teams: p.teams.map((t) => ({ ...t, playerIds: t.playerIds.filter((x) => x !== id) })),
            }
          : p,
      ),
    }));
    toast.success("Jogador removido do cadastro");
  };

  return (
    <main className="min-h-screen pb-28">
      <PageHeader
        title="Elenco"
        subtitle="Jogadores cadastrados da turma"
        back="/"
        action={
          <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground tabular">
            {db.players.length} jogadores
          </span>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jogador"
              className="h-12 pl-9"
            />
          </div>
          <Button className="h-12 shrink-0 px-4" onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" /> Novo
          </Button>
        </div>

        {hydrated && db.players.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhum jogador cadastrado"
            description="Cadastre a turma aqui uma vez e reaproveite em todas as marcoladas."
            action={<Button onClick={() => setCreating(true)}>Cadastrar jogador</Button>}
          />
        ) : list.length === 0 ? (
          <EmptyState title="Nada encontrado" description="Tente outro nome ou cadastre um novo jogador." />
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Avatar player={p} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{displayName(p)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.nickname ? p.name : null, p.position, p.number ? `#${p.number}` : null]
                        .filter(Boolean)
                        .join(" · ") || "Sem detalhes"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    aria-label={`Editar ${p.name}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(p)}
                    aria-label={`Excluir ${p.name} do cadastro`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2 pl-1">
                  <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                    Habilidade
                  </span>
                  <StarRating
                    value={p.rating ?? 0}
                    size={17}
                    label={`Habilidade de ${displayName(p)}`}
                    onChange={(v) => updatePlayer(p.id, { rating: v })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PlayerFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={(data) => {
          const player = addPlayer(data);
          toast.success(`${displayName(player)} cadastrado`);
        }}
      />

      <PlayerFormDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        player={editing}
        onSubmit={(data) => {
          if (!editing) return;
          updatePlayer(editing.id, data);
          toast.success("Jogador atualizado");
          setEditing(null);
        }}
      />

      <AlertDialog
        open={Boolean(removing)}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {removing ? displayName(removing) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              O jogador sai do cadastro e da marcolada em andamento. As estatísticas já registradas não mudam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) removeFromRegistry(removing.id);
                setRemoving(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
