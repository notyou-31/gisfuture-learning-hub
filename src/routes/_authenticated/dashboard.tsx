import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict, isAfter, startOfDay } from "date-fns";
import { ArrowRight, CalendarDays, ClipboardList, Megaphone, NotebookPen, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isStaffRole, useMe } from "@/hooks/use-me";
import { myAttemptsQuery, publishedTestsQuery, useCatalog } from "@/hooks/use-catalog";
import { overall } from "@/lib/analytics";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GISFuture" }, { name: "description", content: "Your GISFuture dashboard." }] }),
  component: Dashboard,
});

function useBoard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const exams = useQuery({
    queryKey: ["exams", "upcoming"],
    queryFn: async () => (await supabase.from("exams").select("*").gte("exam_date", today).order("exam_date").limit(4)).data ?? [],
  });
  const homework = useQuery({
    queryKey: ["homework", "recent"],
    queryFn: async () => (await supabase.from("homework").select("*").order("created_at", { ascending: false }).limit(4)).data ?? [],
  });
  const news = useQuery({
    queryKey: ["announcements", "recent"],
    queryFn: async () =>
      (await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(4)).data ?? [],
  });
  return { exams: exams.data ?? [], homework: homework.data ?? [], news: news.data ?? [] };
}

function Dashboard() {
  const { data: me } = useMe();
  if (!me) return null;
  return isStaffRole(me.role) ? <StaffDashboard name={me.fullName} /> : <StudentDashboard userId={me.id} name={me.fullName} />;
}

function StudentDashboard({ userId, name }: { userId: string; name: string }) {
  const attempts = useQuery(myAttemptsQuery(userId));
  const tests = useQuery(publishedTestsQuery);
  const { subjectName } = useCatalog();
  const board = useBoard();
  const done = new Set((attempts.data ?? []).filter((a) => !a.archived).map((a) => a.test_id));
  const pending = (tests.data ?? []).filter((t) => !done.has(t.id) && t.question_count > 0);
  const active = (attempts.data ?? []).filter((a) => !a.archived);
  const o = overall(
    active.map((a) => ({ ...a, subject_id: a.tests?.subject_id ?? null, chapter_id: a.tests?.chapter_id ?? null, title: a.tests?.title ?? "" })),
  );

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={`Namaste, ${name.split(" ")[0]}`} description="Here's what's happening in your Class 10 this week." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tests taken" value={o.tests} />
        <StatCard label="Average marks" value={`${o.percent}%`} tone="saffron" />
        <StatCard label="Accuracy" value={`${o.accuracy}%`} tone="success" />
        <StatCard label="Tests waiting" value={pending.length} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><ClipboardList className="size-5 text-primary" /> Tests to attempt</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/tests">All tests <ArrowRight /></Link></Button>
          </div>
          {pending.length === 0 ? (
            <EmptyState title="You're all caught up" text="New tests from your teachers will show up here." />
          ) : (
            <ul className="divide-y">
              {pending.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.subject_id ? subjectName[t.subject_id] : "General"} · {t.question_count} questions · {t.duration_minutes} min
                    </p>
                  </div>
                  <Button asChild size="sm"><Link to="/tests/$testId" params={{ testId: t.id }}>Start</Link></Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <ExamsPanel exams={board.exams} subjectName={subjectName} />
        <HomeworkPanel items={board.homework} subjectName={subjectName} />
        <NewsPanel items={board.news} className="lg:col-span-2" />
      </div>
    </>
  );
}

function StaffDashboard({ name }: { name: string }) {
  const { subjectName } = useCatalog();
  const board = useBoard();
  const counts = useQuery({
    queryKey: ["staff-counts"],
    queryFn: async () => {
      const [students, tests, resources, attempts] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("resources").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).eq("archived", false),
      ]);
      return { students: students.count ?? 0, tests: tests.count ?? 0, resources: resources.count ?? 0, attempts: attempts.count ?? 0 };
    },
  });
  const c = counts.data;
  return (
    <>
      <PageHeader
        eyebrow="Staff room"
        title={`Welcome, ${name.split(" ")[0]}`}
        description="Upload material, set tests and keep Class 10 informed."
        actions={
          <>
            <Button asChild variant="outline"><Link to="/teach/library">Upload material</Link></Button>
            <Button asChild><Link to="/teach/tests">Create a test</Link></Button>
          </>
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={c?.students ?? "–"} />
        <StatCard label="Tests" value={c?.tests ?? "–"} tone="saffron" />
        <StatCard label="Study items" value={c?.resources ?? "–"} tone="success" />
        <StatCard label="Attempts" value={c?.attempts ?? "–"} tone="destructive" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <NewsPanel items={board.news} className="lg:col-span-2" />
        <ExamsPanel exams={board.exams} subjectName={subjectName} />
        <HomeworkPanel items={board.homework} subjectName={subjectName} className="lg:col-span-3" />
      </div>
    </>
  );
}

type Exam = { id: string; title: string; exam_date: string; start_time: string | null; subject_id: string | null };
function ExamsPanel({ exams, subjectName }: { exams: Exam[]; subjectName: Record<string, string> }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="size-5 text-primary" /> Upcoming exams</h2>
        <Link to="/exams" className="text-sm text-primary">All</Link>
      </div>
      {exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exams scheduled.</p>
      ) : (
        <ul className="space-y-3">
          {exams.map((e) => {
            const d = new Date(e.exam_date + "T00:00:00");
            return (
              <li key={e.id} className="flex items-center gap-3">
                <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-saffron-soft py-1.5 text-saffron-foreground">
                  <span className="text-[10px] font-semibold uppercase">{format(d, "MMM")}</span>
                  <span className="font-display text-xl font-bold leading-none">{format(d, "d")}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.subject_id ? subjectName[e.subject_id] : "All subjects"}
                    {isAfter(d, startOfDay(new Date())) ? ` · in ${formatDistanceToNowStrict(d)}` : " · today"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

type Hw = { id: string; title: string; due_date: string | null; subject_id: string | null };
function HomeworkPanel({ items, subjectName, className }: { items: Hw[]; subjectName: Record<string, string>; className?: string }) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><NotebookPen className="size-5 text-primary" /> Homework</h2>
        <Link to="/homework" className="text-sm text-primary">All</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No homework posted.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((h) => (
            <li key={h.id}>
              <p className="font-semibold">{h.title}</p>
              <p className="text-xs text-muted-foreground">
                {h.subject_id ? subjectName[h.subject_id] : "General"}
                {h.due_date ? ` · due ${format(new Date(h.due_date + "T00:00:00"), "d MMM")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

type News = { id: string; title: string; body: string | null; is_pinned: boolean; created_at: string };
function NewsPanel({ items, className }: { items: News[]; className?: string }) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Megaphone className="size-5 text-primary" /> Announcements</h2>
        <Link to="/announcements" className="text-sm text-primary">All</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((n) => (
            <li key={n.id} className="border-l-4 border-saffron pl-3">
              <p className="flex items-center gap-1.5 font-semibold">{n.is_pinned && <Pin className="size-3.5 text-saffron" />}{n.title}</p>
              {n.body && <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{format(new Date(n.created_at), "d MMM yyyy")}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
