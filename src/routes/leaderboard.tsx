import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Loading } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — GISFuture" },
      { name: "description", content: "Top scorers in GISFuture MCQ tests at Gayatri International School." },
      { property: "og:title", content: "GISFuture Leaderboard" },
      { property: "og:description", content: "See the highest-scoring Class 10 students in online tests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [testId, setTestId] = useState<string>("all");
  const tests = useQuery({
    queryKey: ["lb-tests"],
    queryFn: async () => (await supabase.rpc("get_leaderboard_tests")).data ?? [],
  });
  const board = useQuery({
    queryKey: ["leaderboard", testId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", testId === "all" ? {} : { _test_id: testId });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = board.data ?? [];
  const podium = rows.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Brand />
        <Button asChild variant="outline">
          <Link to="/dashboard">My dashboard</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Public leaderboard</p>
            <h1 className="text-4xl font-semibold">Top scorers</h1>
            <p className="mt-2 text-muted-foreground">Total marks across GISFuture tests.</p>
          </div>
          <Select value={testId} onValueChange={setTestId}>
            <SelectTrigger className="w-full sm:w-72 bg-card">
              <SelectValue placeholder="All tests" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tests</SelectItem>
              {(tests.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {board.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Trophy className="size-5" />} title="No scores yet" text="Scores will appear here once students complete tests." />
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {podium.map((r, i) => (
                <div
                  key={`${r.full_name}-${i}`}
                  className={cn(
                    "rounded-2xl border p-6 text-center shadow-soft",
                    i === 0 ? "bg-saffron text-saffron-foreground sm:-translate-y-2" : "bg-card",
                  )}
                >
                  <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-card/60">
                    {i === 0 ? <Crown className="size-6" /> : <Medal className="size-6 text-primary" />}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">Rank {r.rank}</p>
                  <p className="mt-1 font-display text-xl font-semibold">{r.full_name}</p>
                  <p className="mt-2 font-display text-3xl font-bold">{Number(r.total_score)}</p>
                  <p className="text-xs opacity-75">{r.tests_taken} tests · {r.accuracy ?? 0}% accuracy</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3 text-right">Marks</th>
                    <th className="hidden px-4 py-3 text-right sm:table-cell">Tests</th>
                    <th className="hidden px-4 py-3 text-right sm:table-cell">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.full_name}-${i}`} className="border-t">
                      <td className="px-4 py-3 font-semibold">#{r.rank}</td>
                      <td className="px-4 py-3">{r.full_name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{Number(r.total_score)}</td>
                      <td className="hidden px-4 py-3 text-right sm:table-cell">{r.tests_taken}</td>
                      <td className="hidden px-4 py-3 text-right sm:table-cell">{r.accuracy ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
