import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 18,
  label,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  label?: string;
  className?: string;
}) {
  const readOnly = !onChange;
  return (
    <div className={cn("flex items-center gap-1", className)} role={readOnly ? "img" : "group"} aria-label={label ?? `Habilidade ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Icon = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              filled ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/45",
            )}
          />
        );
        if (readOnly) return <span key={n}>{Icon}</span>;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value === n ? n - 1 : n);
            }}
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-accent"
          >
            {Icon}
          </button>
        );
      })}
    </div>
  );
}
