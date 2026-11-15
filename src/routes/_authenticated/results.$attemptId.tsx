import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ReviewPayload } from "@/lib/test-types";
import { EmptyState, Loading, PageHeader, Panel, StatCard } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/results/$attemptId")({
  head: () => ({ meta: [{ title: "Result — GISFuture" }, { name: "description", content: "Your test result and answer review." }] }),
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();
  const q = useQuery({
    queryKey: ["review", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_attempt_review", { _attempt_id: attemptId });
      if (error) throw error;
      return data as unknown as ReviewPayload;
    },
  });
  if (q.isLoading) return <Loading />;
  if (!q.data) return <EmptyState title="Result not found" />;
  const { attempt: a, test, questions } = q.data;
  const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
  const acc = a.correct_count + a.wrong_count > 0 ? Math.round((a.correct_count / (a.correct_count + a.wrong_count)) * 100) : 0;

  return (
    <>
      <Link to="/tests" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Tests</Link>
      <PageHeader eyebrow="Result" title={test.title} description={`Submitted ${new Date(a.submitted_at).toLocaleString()}${a.time_taken_seconds ? ` · ${Math.ceil(a.time_taken_seconds / 60)} min taken` : ""}`} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Marks" value={`${Number(a.score)} / ${Number(a.max_score)}`} hint={`${pct}%`} />
        <StatCard label="Accuracy" value={`${acc}%`} tone="saffron" />
        <StatCard label="Correct" value={a.correct_count} tone="success" />
        <StatCard label="Wrong / skipped" value={`${a.wrong_count} / ${a.skipped_count}`} tone="destructive" />
      </div>
      <h2 className="mb-4 text-2xl font-semibold">Answer review</h2>
      <div className="space-y-4">
        {questions.map((qq, i) => {
          const ans = a.answers[qq.id];
          const status = ans?.correct === true ? "correct" : ans?.correct === false ? "wrong" : "skipped";
          return (
            <Panel key={qq.id} className={cn("border-l-4", status === "correct" ? "border-l-success" : status === "wrong" ? "border-l-destructive" : "border-l-border")}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">Q{i + 1}</p>
                <span className={cn("flex items-center gap-1 text-sm font-semibold", status === "correct" ? "text-success" : status === "wrong" ? "text-destructive" : "text-muted-foreground")}>
                  {status === "correct" ? <CheckCircle2 className="size-4" /> : status === "wrong" ? <XCircle className="size-4" /> : <MinusCircle className="size-4" />}
                  {status === "correct" ? `+${Number(qq.marks)}` : status === "wrong" ? `−${Number(qq.negative_marks)}` : "Skipped"}
                </span>
              </div>
              <p className="whitespace-pre-wrap font-medium">{qq.prompt}</p>
              {qq.qtype === "mcq" ? (
                <ul className="mt-3 space-y-1.5">
                  {qq.options.map((o, oi) => {
                    const isCorrect = qq.correct_index === oi;
                    const isMine = ans?.answer === String(oi);
                    return (
                      <li key={oi} className={cn("rounded-lg border px-3 py-2 text-sm", isCorrect && "border-success bg-success-soft", isMine && !isCorrect && "border-destructive bg-destructive-soft")}>
                        <span className="mr-2 font-semibold">{String.fromCharCode(65 + oi)}.</span>{o}
                        {isMine && <span className="ml-2 text-xs font-semibold">(your answer)</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm">
                  Your answer: <b>{ans?.answer ?? "—"}</b> · Correct answer: <b className="text-success">{qq.correct_value}</b>
                </p>
              )}
              {qq.explanation && <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground"><b>Explanation:</b> {qq.explanation}</p>}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
