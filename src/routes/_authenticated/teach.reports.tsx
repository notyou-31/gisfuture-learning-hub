import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePeople } from "@/hooks/use-people";
import { useCatalog } from "@/hooks/use-catalog";
import { EmptyState, Loading, PageHeader, Panel, RoleGate, StatCard } from "@/components/app/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/teach/reports")({
  head: () => ({ meta: [{ title: "Reports — GISFuture" }, { name: "description", content: "Test reports and most correct answers." }] }),
  component: () => (
    <RoleGate roles={["teacher", "super_admin"]}>
      <Reports />
    </RoleGate>
  ),
});

function Reports() {
  const { byId } = usePeople();
  const { subjectName } = useCatalog();
  const [testId, setTestId] = useState("all");
  const tests = useQuery({
    queryKey: ["tests", "manage"],
    queryFn: async () => (await supabase.from("tests").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const attempts = useQuery({
    queryKey: ["attempts", "report"],
    queryFn: async () => (await supabase.from("attempts").select("*").eq("archived", false)).data ?? [],
  });
  const questions = useQuery({
    queryKey: ["questions", testId],
    enabled: testId !== "all",
    queryFn: async () => (await supabase.from("questions").select("id, prompt, qtype, sort, created_at").eq("test_id", testId).order("sort").order("created_at")).data ?? [],
  });
  if (tests.isLoading || attempts.isLoading) return <Loading />;

  const rows = (attempts.data ?? []).filter((a) => testId === "all" || a.test_id === testId);
  // aggregate per student
  const per = new Map<string, { id: string; correct: number; wrong: number; skipped: number; score: number; max: number; tests: number }>();
  for (const a of rows) {
    const s = per.get(a.user_id) ?? { id: a.user_id, correct: 0, wrong: 0, skipped: 0, score: 0, max: 0, tests: 0 };
    s.correct += a.correct_count; s.wrong += a.wrong_count; s.skipped += a.skipped_count;
    s.score += Number(a.score); s.max += Number(a.max_score); s.tests += 1;
    per.set(a.user_id, s);
  }
  const ranked = [...per.values()].sort((x, y) => y.correct - x.correct || y.score - x.score);
  const totalC = ranked.reduce((n, s) => n + s.correct, 0);
  const totalW = ranked.reduce((n, s) => n + s.wrong, 0);
  const avg = ranked.length ? Math.round((ranked.reduce((n, s) => n + (s.max ? s.score / s.max : 0), 0) / ranked.length) * 100) : 0;

  const qStats = (questions.data ?? []).map((q, i) => {
    let c = 0, w = 0, sk = 0;
    rows.forEach((a) => {
      const v = (a.answers as Record<string, { correct: boolean | null }>)[q.id];
      if (v?.correct === true) c++; else if (v?.correct === false) w++; else sk++;
    });
    const n = c + w + sk;
    return { i: i + 1, prompt: q.prompt, c, w, sk, pct: n ? Math.round((c / n) * 100) : 0 };
  });

  return (
    <>
      <PageHeader
        eyebrow="Teaching"
        title="Reports"
        description="Who got the most answers right, and which questions students found hardest."
        actions={
          <Select value={testId} onValueChange={setTestId}>
            <SelectTrigger className="w-72 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tests</SelectItem>
              {(tests.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students attempted" value={ranked.length} />
        <StatCard label="Attempts" value={rows.length} tone="saffron" />
        <StatCard label="Average marks" value={`${avg}%`} tone="success" />
        <StatCard label="Class accuracy" value={`${totalC + totalW ? Math.round((totalC / (totalC + totalW)) * 100) : 0}%`} tone="destructive" />
      </div>

      {ranked.length === 0 ? (
        <EmptyState icon={<BarChart3 className="size-5" />} title="No attempts yet" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Panel className="overflow-x-auto">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Trophy className="size-5 text-saffron" /> Most correct answers</h2>
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="pb-2">#</th><th className="pb-2">Student</th><th className="pb-2 text-right">Correct</th><th className="pb-2 text-right">Wrong</th><th className="pb-2 text-right">Skipped</th><th className="pb-2 text-right">Marks</th></tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2.5 font-semibold">{i + 1}</td>
                    <td className="py-2.5">{byId[s.id]?.full_name ?? "Removed user"}<span className="block text-xs text-muted-foreground">{s.tests} test{s.tests > 1 ? "s" : ""}</span></td>
                    <td className="py-2.5 text-right font-semibold text-success">{s.correct}</td>
                    <td className="py-2.5 text-right text-destructive">{s.wrong}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{s.skipped}</td>
                    <td className="py-2.5 text-right font-semibold">{s.score} / {s.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel>
            {testId === "all" ? (
              <>
                <h2 className="mb-4 text-xl font-semibold">Tests overview</h2>
                <ul className="space-y-3">
                  {(tests.data ?? []).map((t) => {
                    const ta = (attempts.data ?? []).filter((a) => a.test_id === t.id);
                    const p = ta.length ? Math.round((ta.reduce((n, a) => n + (Number(a.max_score) ? Number(a.score) / Number(a.max_score) : 0), 0) / ta.length) * 100) : 0;
                    return (
                      <li key={t.id}>
                        <button className="w-full text-left" onClick={() => setTestId(t.id)}>
                          <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{t.title}</span><span>{ta.length} · avg {p}%</span></div>
                          <Progress value={p} />
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.subject_id ? subjectName[t.subject_id] : "General"}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <h2 className="mb-4 text-xl font-semibold">Question-wise correctness</h2>
                <ul className="space-y-3">
                  {qStats.map((q) => (
                    <li key={q.i}>
                      <div className="mb-1 flex justify-between gap-3 text-sm"><span className="line-clamp-1">Q{q.i}. {q.prompt}</span><span className="shrink-0 font-semibold">{q.pct}%</span></div>
                      <Progress value={q.pct} />
                      <p className="mt-0.5 text-xs text-muted-foreground">{q.c} correct · {q.w} wrong · {q.sk} skipped</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
