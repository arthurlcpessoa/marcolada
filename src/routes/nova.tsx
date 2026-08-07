import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/marcolada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uid, useStore } from "@/lib/store";
import type { Marcolada } from "@/lib/types";

export const Route = createFileRoute("/nova")({
  head: () => ({
    meta: [
      { title: "Nova marcolada — Marcolada Stats" },
      { name: "description", content: "Cadastre data, local, formato e duração da sua próxima marcolada." },
      { property: "og:title", content: "Nova marcolada — Marcolada Stats" },
      { property: "og:description", content: "Cadastre os dados da próxima marcolada em segundos." },
    ],
  }),
  component: NovaMarcolada,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function NovaMarcolada() {
  const navigate = useNavigate();
  const { update, activeMarcolada } = useStore();
  const initialDate = todayISO();
  const [date, setDate] = useState(initialDate);
  const [name, setName] = useState(
    `Marcolada – ${initialDate.split("-").reverse().join("/")}`,
  );
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [format, setFormat] = useState("");
  const [limit, setLimit] = useState("");

  const create = () => {
    if (!name.trim() || !date) {
      toast.error("Nome e data são obrigatórios");
      return;
    }
    const marcolada: Marcolada = {
      id: uid(),
      name: name.trim(),
      date,
      location: location.trim() || undefined,
      duration: duration.trim() || undefined,
      format: format.trim() || undefined,
      limit: limit.trim() || undefined,
      status: "active",
      rosterIds: [],
      teams: [],
      matches: [],
      createdAt: Date.now(),
    };
    update((d) => ({
      ...d,
      marcoladas: [
        ...d.marcoladas.map((p) =>
          p.status === "active" ? { ...p, status: "finished" as const, endedAt: Date.now() } : p,
        ),
        marcolada,
      ],
    }));
    navigate({ to: "/jogadores" });
  };

  return (
    <main className="min-h-screen pb-28">
      <PageHeader title="Nova marcolada" subtitle="Passo 1 de 3 · Dados do dia" back="/" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {activeMarcolada ? (
          <p className="rounded-xl border border-primary/25 bg-accent px-4 py-3 text-sm text-accent-foreground">
            Existe uma marcolada em andamento (<strong>{activeMarcolada.name}</strong>). Ao criar uma nova,
            ela será encerrada.
          </p>
        ) : null}

        <div className="surface space-y-4 p-4 sm:p-5">
          <Field label="Nome da marcolada" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marcolada de quinta" />
          </Field>
          <Field label="Data" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Local">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Arena Central" />
            </Field>
            <Field label="Duração estimada">
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="2 horas" />
            </Field>
            <Field label="Formato">
              <Input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="5 x 5" />
            </Field>
            <Field label="Limite por partida">
              <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="2 gols ou 10 min" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Somente nome e data são obrigatórios. Os demais campos podem ficar em branco.
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button size="lg" className="h-13 w-full text-base font-semibold" onClick={create}>
            Criar marcolada e escolher jogadores
          </Button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
