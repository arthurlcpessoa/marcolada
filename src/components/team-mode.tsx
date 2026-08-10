import { Repeat, Shield } from "lucide-react";
import type { TeamMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: TeamMode; title: string; description: string; icon: typeof Shield }[] = [
  {
    value: "fixed",
    title: "Times fixos",
    description: "Os jogadores ficam nas mesmas equipes durante toda a marcolada.",
    icon: Shield,
  },
  {
    value: "rotation",
    title: "Rodízio de jogadores",
    description: "Cada partida tem sua própria escalação, com quem entra, quem sai e quem fica de fora.",
    icon: Repeat,
  },
];

export function TeamModeSelector({
  value,
  onChange,
  className,
}: {
  value: TeamMode;
  onChange: (mode: TeamMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "flex gap-3 rounded-2xl border p-3.5 text-left transition-colors",
              active ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{opt.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
