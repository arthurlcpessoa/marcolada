import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Camera, Check, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageHeader } from "@/components/marcolada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/star-rating";
import { useStore } from "@/lib/store";
import { displayName } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogadores")({
  head: () => ({
    meta: [
      { title: "Jogadores da marcolada — Marcolada Stats" },
      { name: "description", content: "Selecione quem está presente e cadastre novos jogadores da marcolada." },
      { property: "og:title", content: "Jogadores da marcolada — Marcolada Stats" },
      { property: "og:description", content: "Monte a lista de presentes da marcolada em poucos toques." },
    ],
  }),
  component: JogadoresPage,
});

function JogadoresPage() {
  const navigate = useNavigate();
  const { db, hydrated, activeMarcolada, updateMarcolada, addPlayer, updatePlayer, update } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const roster = activeMarcolada?.rosterIds ?? [];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.players
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.nickname ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        const inA = roster.includes(a.id) ? 0 : 1;
        const inB = roster.includes(b.id) ? 0 : 1;
        return inA - inB || a.name.localeCompare(b.name);
      });
  }, [db.players, query, roster]);

  if (hydrated && !activeMarcolada) {
    return (
      <main className="min-h-screen">
        <PageHeader title="Jogadores" back="/" />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhuma marcolada em andamento"
            description="Crie uma marcolada para montar a lista de presentes."
            action={<Button onClick={() => navigate({ to: "/nova" })}>Nova marcolada</Button>}
          />
        </div>
      </main>
    );
  }

  const toggle = (id: string) => {
    if (!activeMarcolada) return;
    updateMarcolada(activeMarcolada.id, (p) => ({
      ...p,
      rosterIds: p.rosterIds.includes(id)
        ? p.rosterIds.filter((x) => x !== id)
        : [...p.rosterIds, id],
      teams: p.rosterIds.includes(id)
        ? p.teams.map((t) => ({ ...t, playerIds: t.playerIds.filter((x) => x !== id) }))
        : p.teams,
    }));
  };

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
        title="Quem veio hoje?"
        subtitle="Passo 2 de 3 · Lista de presentes"
        back="/nova"
        action={
          <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground tabular">
            {roster.length} selecionados
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
          <Button className="h-12 shrink-0 px-4" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Novo
          </Button>
        </div>

        {db.players.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhum jogador cadastrado"
            description="Cadastre o primeiro jogador da turma. Depois ele fica salvo para as próximas marcoladas."
            action={<Button onClick={() => setOpen(true)}>Cadastrar jogador</Button>}
          />
        ) : list.length === 0 ? (
          <EmptyState title="Nada encontrado" description="Tente outro nome ou cadastre um novo jogador." />
        ) : (
          <ul className="space-y-2">
            {list.map((p) => {
              const selected = roster.includes(p.id);
              return (
                <li key={p.id}>
                  <div
                    className={cn(
                      "rounded-2xl border bg-card p-3 transition-colors",
                      selected ? "border-primary/45 bg-accent/60" : "border-border",
                    )}
                  >
                   <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar player={p} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{displayName(p)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[p.nickname ? p.name : null, p.position, p.number ? `#${p.number}` : null]
                            .filter(Boolean)
                            .join(" · ") || "Sem detalhes"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-transparent",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromRegistry(p.id)}
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            size="lg"
            className="h-13 w-full text-base font-semibold"
            disabled={roster.length < 2}
            onClick={() => navigate({ to: "/times" })}
          >
            {roster.length < 2 ? "Selecione ao menos 2 jogadores" : "Montar os times"}
          </Button>
        </div>
      </div>

      <NewPlayerDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(data) => {
          const player = addPlayer(data);
          if (activeMarcolada) {
            updateMarcolada(activeMarcolada.id, (p) => ({ ...p, rosterIds: [...p.rosterIds, player.id] }));
          }
          toast.success(`${displayName(player)} adicionado`);
        }}
      />
    </main>
  );
}

function NewPlayerDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: {
    name: string;
    nickname?: string | undefined;
    photo?: string | undefined;
    position?: string | undefined;
    number?: string | undefined;
    rating?: number | undefined;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState("");
  const [number, setNumber] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState(3);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setNickname("");
    setPosition("");
    setNumber("");
    setPhoto(undefined);
    setRating(3);
  };

  const pickPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        setPhoto(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo jogador</DialogTitle>
          <DialogDescription>Só o nome é obrigatório. Ele fica salvo para as próximas marcoladas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-primary/40 bg-accent text-primary"
            >
              {photo ? (
                <img src={photo} alt="Prévia" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Nome *
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickPhoto(f);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Apelido
              </Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Camisa
              </Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="10" inputMode="numeric" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Posição
              </Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Goleiro, zaga, ataque..." />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Habilidade
              </Label>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-accent/40 px-3 py-2">
                <StarRating value={rating} onChange={setRating} size={22} />
                <span className="ml-auto text-sm font-semibold tabular">{rating}/5</span>
              </div>
              <p className="text-xs text-muted-foreground">Usada para equilibrar o sorteio dos times. Dá para editar depois.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              if (!name.trim()) {
                toast.error("Informe o nome do jogador");
                return;
              }
              onCreate({
                name: name.trim(),
                nickname: nickname.trim() || undefined,
                position: position.trim() || undefined,
                number: number.trim() || undefined,
                photo,
                rating,
              });
              reset();
              onOpenChange(false);
            }}
          >
            Adicionar à marcolada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
