import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Brand({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-lg bg-saffron font-display text-lg font-bold text-saffron-foreground">
        G
      </span>
      <span className="leading-tight">
        <span className={cn("block font-display text-lg font-semibold", tone === "light" ? "text-sidebar-accent-foreground" : "text-foreground")}>
          GIS<span className="text-saffron">Future</span>
        </span>
        <span className={cn("block text-[11px] uppercase tracking-[0.14em]", tone === "light" ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
          Gayatri International School
        </span>
      </span>
    </Link>
  );
}
