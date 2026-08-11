import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
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
import type { Player } from "@/lib/types";

export type PlayerFormData = {
  name: string;
  nickname?: string | undefined;
  photo?: string | undefined;
  position?: string | undefined;
  number?: string | undefined;
  rating?: number | undefined;
};

export function PlayerFormDialog({
  open,
  onOpenChange,
  player,
  onSubmit,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Quando presente, o diálogo edita esse jogador. */
  player?: Player | null;
  onSubmit: (data: PlayerFormData) => void;
  submitLabel?: string;
}) {
  const editing = Boolean(player);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState("");
  const [number, setNumber] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState(3);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(player?.name ?? "");
    setNickname(player?.nickname ?? "");
    setPosition(player?.position ?? "");
    setNumber(player?.number ?? "");
    setPhoto(player?.photo);
    setRating(player?.rating ?? 3);
  }, [open, player]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar jogador" : "Novo jogador"}</DialogTitle>
          <DialogDescription>
            Só o nome é obrigatório. O cadastro fica salvo para todas as marcoladas.
          </DialogDescription>
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
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Nome *</Label>
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
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Apelido</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Camisa</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="10" inputMode="numeric" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Posição</Label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Goleiro, zaga, ataque..."
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Habilidade</Label>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-accent/40 px-3 py-2">
                <StarRating value={rating} onChange={setRating} size={22} />
                <span className="ml-auto text-sm font-semibold tabular">{rating}/5</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usada para equilibrar o sorteio dos times. Dá para editar quando quiser.
              </p>
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
              onSubmit({
                name: name.trim(),
                nickname: nickname.trim() || undefined,
                position: position.trim() || undefined,
                number: number.trim() || undefined,
                photo,
                rating,
              });
              onOpenChange(false);
            }}
          >
            {submitLabel ?? (editing ? "Salvar alterações" : "Cadastrar jogador")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
