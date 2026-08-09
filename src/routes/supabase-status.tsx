import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/marcolada";
import { Button } from "@/components/ui/button";
import { checkSupabaseConnection, type SupabaseHealth } from "@/lib/supabase";

export const Route = createFileRoute("/supabase-status")({
  head: () => ({
    meta: [
      { title: "Status do Supabase — Marcolada Stats" },
      { name: "description", content: "Verifique se a conexão com o banco de dados do Marcolada Stats está ativa." },
      { property: "og:title", content: "Status do Supabase — Marcolada Stats" },
      { property: "og:description", content: "Teste em tempo real da conexão com o Supabase." },
    ],
  }),
  component: SupabaseStatus,
});

function SupabaseStatus() {
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    void checkSupabaseConnection()
      .then(setHealth)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    run();
  }, []);

  return (
    <main className="min-h-screen pb-16">
      <PageHeader title="Conexão Supabase" subtitle="Diagnóstico da integração" back="/" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div className="surface space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2.5 rounded-full ${
                loading ? "bg-muted-foreground" : health?.ok ? "bg-emerald-500" : "bg-destructive"
              }`}
            />
            <p className="text-sm font-semibold">
              {loading ? "Testando..." : health?.ok ? "Conectado" : "Falha na conexão"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground break-all">{health?.url ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{health?.detail ?? ""}</p>
          <Button onClick={run} disabled={loading} variant="outline" size="sm">
            Testar novamente
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Nenhuma tabela foi criada. Os dados continuam salvos no dispositivo por enquanto.
        </p>
      </div>
    </main>
  );
}
