import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";
import { initials } from "@/lib/stats";
import logoAsset from "@/assets/marcolada-logo.png.asset.json";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logoAsset.url}
        alt="Escudo do Marcolada Futebol Clube"
        className="h-10 w-10 shrink-0 object-contain"
      />
      <span className="min-w-0">
        <span className="block font-display text-base leading-none font-extrabold">Marcolada</span>
        <span className="block text-[0.65rem] leading-tight font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Stats
        </span>
      </span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {back ? (
            <Link
              to={back}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function Avatar({ player, size = 40 }: { player: Player; size?: number }) {
  return player.photo ? (
    <img
      src={player.photo}
      alt={player.name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover ring-1 ring-border"
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="grid shrink-0 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground"
    >
      {initials(player)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "plain" | "blue";
}) {
  return (
    <div
      className={cn(
        "surface flex min-w-0 flex-col gap-1 p-4",
        tone === "blue" && "hero-blue border-transparent",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "truncate text-[0.68rem] font-semibold tracking-[0.12em] uppercase",
            tone === "blue" ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        {icon ? (
          <span className={tone === "blue" ? "text-primary-foreground/80" : "text-primary"}>{icon}</span>
        ) : null}
      </div>
      <span className="truncate font-display text-xl font-extrabold tabular sm:text-2xl">{value}</span>
      {hint ? (
        <span
          className={cn(
            "truncate text-xs",
            tone === "blue" ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="font-display text-base font-bold">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function TeamDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10", className)}
      style={{ backgroundColor: color }}
    />
  );
}
