import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMe } from "@/hooks/use-me";
import { myAttemptsQuery, useCatalog } from "@/hooks/use-catalog";
import { groupStats, overall, strengthsAndWeaknesses, type AttemptForStats } from "@/lib/analytics";
import { EmptyState, Loading, PageHeader, Panel, StatCard } from "@/components/app/ui";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "My progress — GISFuture" }, { name: "description", content: "Marks, accuracy and strengths analysis." }] }),
  component: ProgressPage,
});

const C = { primary: "var(--color-chart-1)", saffron: "var(--color-chart-2)", success: "var(--color-chart-3)", danger: "var(--color-chart-4)", muted: "var(--color-border)" };

function ProgressPage() {
  const { data: me } = useMe();
  const q = useQuery({ ...myAttemptsQuery(me?.id ?? ""), enabled: !!me });
  const { subjectName, chapterName, isLoading } = useCatalog();
  if (q.isLoading || isLoading) return <Loading />;
  const rows: (AttemptForStats & { id: string })[] = (q.data ?? [])
    .filter((a) => !a.archived)
    .map((a) => ({ ...a, subject_id: a.tests?.subject_id ?? null, chapter_id: a.tests?.chapter_id ?? null, title: a.tests?.title ?? "Test" }));

  if (rows.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Analysis" title="My progress" />
        <EmptyState icon={<BarChart3 className="size-5" />} title="No tests taken yet" text="Attempt a test to see your marks, accuracy and strengths here." />
      </>
    );
  }

  const o = overall(rows);
  const bySubject = groupStats(rows, "subject_id", subjectName);
  const byChapter = groupStats(rows, "chapter_id", chapterName);
  const sw = strengthsAndWeaknesses([...bySubject, ...byChapter]);
  const trend = rows.map((r, i) => ({
    name: `#${i + 1}`,
    title: r.title,
    percent: r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0,
  }));
  const pie = [
    { name: "Correct", value: o.correct, color: C.success },
    { name: "Wrong", value: o.wrong, color: C.danger },
    { name: "Skipped", value: o.skipped, color: C.muted },
  ];

  return (
    <>
      <PageHeader eyebrow="Analysis" title="My progress" description="How you're doing across subjects and chapters." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tests taken" value={o.tests} />
        <StatCard label="Total marks" value={`${o.score} / ${o.max}`} hint={`${o.percent}% overall`} tone="saffron" />
        <StatCard label="Accuracy" value={`${o.accuracy}%`} hint="correct ÷ attempted" tone="success" />
        <StatCard label="Questions skipped" value={o.skipped} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-xl font-semibold">Subject-wise marks</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="percent" name="Marks" fill={C.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-xl font-semibold">Progress over time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ""} />
                <Line type="monotone" dataKey="percent" name="Score" stroke={C.saffron} strokeWidth={3} dot={{ r: 4, fill: C.saffron }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-xl font-semibold">Accuracy analysis</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="size-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3">
              {bySubject.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{s.name}</span><span className="font-semibold">{s.accuracy}%</span></div>
                  <Progress value={s.accuracy} />
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-xl font-semibold">Strengths & weaknesses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success"><TrendingUp className="size-4" /> Strong (70%+ accuracy)</p>
              {sw.strengths.length === 0 ? <p className="text-sm text-muted-foreground">Keep practising — none yet.</p> : (
                <ul className="space-y-1.5">{sw.strengths.map((s) => <li key={s.id} className="rounded-lg bg-success-soft px-3 py-1.5 text-sm">{s.name} · {s.accuracy}%</li>)}</ul>
              )}
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-destructive"><TrendingDown className="size-4" /> Needs work (below 50%)</p>
              {sw.weaknesses.length === 0 ? <p className="text-sm text-muted-foreground">No weak areas — great job!</p> : (
                <ul className="space-y-1.5">{sw.weaknesses.map((s) => <li key={s.id} className="rounded-lg bg-destructive-soft px-3 py-1.5 text-sm">{s.name} · {s.accuracy}%</li>)}</ul>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="mt-6 overflow-x-auto">
        <h2 className="mb-4 text-xl font-semibold">Test history</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="pb-2">Test</th><th className="pb-2">Subject</th><th className="pb-2">Date</th><th className="pb-2 text-right">Marks</th><th className="pb-2 text-right">Correct</th><th className="pb-2" /></tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2.5 font-medium">{r.title}</td>
                <td className="py-2.5">{r.subject_id ? subjectName[r.subject_id] : "—"}</td>
                <td className="py-2.5">{format(new Date(r.submitted_at), "d MMM yyyy")}</td>
                <td className="py-2.5 text-right font-semibold">{Number(r.score)} / {Number(r.max_score)}</td>
                <td className="py-2.5 text-right">{r.correct_count}</td>
                <td className="py-2.5 text-right"><Link to="/results/$attemptId" params={{ attemptId: r.id }} className="text-primary">Review</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
