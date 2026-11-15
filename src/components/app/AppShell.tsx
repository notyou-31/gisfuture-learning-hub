import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, FileStack, GraduationCap, KeyRound, LayoutDashboard,
  LibraryBig, LogOut, Megaphone, Menu, NotebookPen, RotateCcw, Trophy, Users, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { ROLE_LABEL, type AppRole } from "@/lib/constants";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: NonNullable<LinkProps["to"]>; label: string; icon: typeof BookOpen; roles: AppRole[] };
const ALL: AppRole[] = ["student", "teacher", "super_admin"];
const STAFF: AppRole[] = ["teacher", "super_admin"];

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Learn",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
      { to: "/subjects", label: "My subjects", icon: BookOpen, roles: ALL },
      { to: "/tests", label: "Tests", icon: ClipboardList, roles: ["student"] },
      { to: "/progress", label: "My progress", icon: BarChart3, roles: ["student"] },
      { to: "/mock-papers", label: "Full mock papers", icon: FileStack, roles: ALL },
    ],
  },
  {
    section: "School board",
    items: [
      { to: "/homework", label: "Homework", icon: NotebookPen, roles: ALL },
      { to: "/exams", label: "Upcoming exams", icon: CalendarDays, roles: ALL },
      { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ALL },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy, roles: ALL },
    ],
  },
  {
    section: "Teaching",
    items: [
      { to: "/teach/library", label: "Upload material", icon: LibraryBig, roles: STAFF },
      { to: "/teach/tests", label: "Create tests", icon: GraduationCap, roles: STAFF },
      { to: "/teach/reports", label: "Reports", icon: BarChart3, roles: STAFF },
    ],
  },
  {
    section: "Super admin",
    items: [
      { to: "/admin/users", label: "Users & sign-ins", icon: Users, roles: ["super_admin"] },
      { to: "/admin/passkeys", label: "Passkeys", icon: KeyRound, roles: ["super_admin"] },
      { to: "/admin/attempts", label: "Reattempts", icon: RotateCcw, roles: ["super_admin"] },
    ],
  },
];

export function AppShell() {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Removed accounts are signed out on the next check.
  useEffect(() => {
    if (!isLoading && me === null) void signOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, me]);

  useEffect(() => {
    const beat = async () => {
      const { data } = await supabase.rpc("touch_last_seen");
      if (data === false) void signOut();
    };
    void beat();
    const id = setInterval(beat, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !me) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
      </div>
    );
  }

  const role = me.role ?? "student";
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) })).filter((s) => s.items.length);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Brand tone="light" />
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {sections.map((s) => (
          <div key={s.section}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">{s.section}</p>
            <ul className="space-y-0.5">
              {s.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="rounded-xl bg-sidebar-accent p-3">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{me.fullName}</p>
        <p className="text-xs text-sidebar-foreground/70">{ROLE_LABEL[role]} · {me.phone}</p>
        <Button variant="saffron" size="sm" className="mt-3 w-full" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-sidebar lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar">{sidebar}</aside>
          <button aria-label="Close menu" className="absolute right-4 top-4 rounded-full bg-card p-2" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <Button variant="outline" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
      </header>
      <main className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10")}>
        <Outlet />
      </main>
    </div>
  );
}
