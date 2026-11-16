import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import type { AppRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string | undefined; title: string; description?: string | undefined; actions?: ReactNode | undefined }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string | undefined; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-5 shadow-soft sm:p-6", className)}>{children}</div>;
}

export function EmptyState({ icon, title, text }: { icon?: ReactNode | undefined; title: string; text?: string | undefined }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary-soft text-primary">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "primary" }: { label: string; value: ReactNode; hint?: string | undefined; tone?: "primary" | "saffron" | "success" | "destructive" | undefined }) {
  const tones = {
    primary: "bg-primary-soft text-accent-foreground",
    saffron: "bg-saffron-soft text-saffron-foreground",
    success: "bg-success-soft text-success",
    destructive: "bg-destructive-soft text-destructive",
  } as const;
  return (
    <div className={cn("rounded-2xl p-5", tones[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-75">{hint}</p>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="grid place-items-center py-16">
      <div className="size-8 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
    </div>
  );
}

export function RoleGate({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { data: me } = useMe();
  if (!me) return <Loading />;
  if (!me.role || !roles.includes(me.role)) {
    return <EmptyState icon={<Lock className="size-5" />} title="Not available for your account" text="This page is only for school staff." />;
  }
  return <>{children}</>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string | undefined }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
