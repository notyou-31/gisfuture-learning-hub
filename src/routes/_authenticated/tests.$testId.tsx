import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { StudentTestPayload } from "@/lib/test-types";
import { EmptyState, Loading, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tests/$testId")({
  head: () => ({ meta: [{ title: "Test — GISFuture" }, { name: "description", content: "Attempt your test." }] }),
  component: TakeTest,
});

function TakeTest() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["take-test", testId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_test_for_student", { _test_id: testId });
      if (error) throw error;
      return data as unknown as StudentTestPayload;
    },
    staleTime: Infinity,
  });
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(0);
  const submittedRef = useRef(false);

  async function submit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const taken = Math.round((Date.now() - startedAt.current) / 1000);
    const { data, error } = await supabase.rpc("submit_attempt", { _test_id: testId, _answers: answers, _time_taken: taken });
    if (error) {
      submittedRef.current = false;
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    if (auto) toast.info("Time's up — your test was submitted.");
    await queryClient.invalidateQueries({ queryKey: ["my-attempts"] });
    navigate({ to: "/results/$attemptId", params: { attemptId: data as string }, replace: true });
  }

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.round((startedAt.current + (q.data!.test.duration_minutes * 60_000) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) void submit(true);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <EmptyState icon={<AlertTriangle className="size-5" />} title="Test not available" text={(q.error as Error | null)?.message} />;
  const { test, questions, existing_attempt } = q.data;

  if (existing_attempt) {
    return (
      <EmptyState
        title="You've already attempted this test"
        text="Ask your administrator if you need to reattempt it."
        icon={<Send className="size-5" />}
      />
    );
  }

  if (!started) {
    return (
      <Panel className="mx-auto max-w-2xl animate-rise">
        <Link to="/tests" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Tests</Link>
        <h1 className="text-3xl font-semibold">{test.title}</h1>
        {test.description && <p className="mt-2 text-muted-foreground">{test.description}</p>}
        <div className="my-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-primary-soft p-4"><p className="font-display text-2xl font-bold">{questions.length}</p><p className="text-xs">Questions</p></div>
          <div className="rounded-xl bg-saffron-soft p-4"><p className="font-display text-2xl font-bold">{Number(test.total_marks)}</p><p className="text-xs">Marks</p></div>
          <div className="rounded-xl bg-success-soft p-4"><p className="font-display text-2xl font-bold">{test.duration_minutes}</p><p className="text-xs">Minutes</p></div>
        </div>
        <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>You can attempt this test only once.</li>
          <li>The test submits automatically when time runs out.</li>
          <li>Some questions may have negative marks for wrong answers — skip if unsure.</li>
        </ul>
        <Button variant="hero" size="lg" className="w-full" onClick={() => { startedAt.current = Date.now(); setLeft(test.duration_minutes * 60); setStarted(true); }}>
          Start test
        </Button>
      </Panel>
    );
  }

  const cur = questions[idx]!;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const answered = Object.values(answers).filter((v) => v !== "").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">Question {idx + 1} of {questions.length}</p>
          <p className="text-xs text-muted-foreground">
            +{Number(cur.marks)}{Number(cur.negative_marks) > 0 ? ` / −${Number(cur.negative_marks)}` : ""} · {cur.qtype === "mcq" ? "Multiple choice" : "Integer answer"}
          </p>
        </div>
        <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed">{cur.prompt}</p>
        <div className="mt-6">
          {cur.qtype === "mcq" ? (
            <div className="space-y-2.5">
              {cur.options.map((opt, i) => {
                const sel = answers[cur.id] === String(i);
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [cur.id]: sel ? "" : String(i) }))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                      sel ? "border-primary bg-primary-soft" : "bg-background hover:border-primary/40",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-sm font-semibold", sel && "border-primary bg-primary text-primary-foreground")}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Input
              inputMode="decimal"
              placeholder="Type your answer (a number)"
              value={answers[cur.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [cur.id]: e.target.value.replace(/[^0-9.-]/g, "") }))}
              className="h-12 max-w-xs text-lg"
            />
          )}
        </div>
        <div className="mt-8 flex justify-between">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ArrowLeft /> Previous</Button>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)}>Next <ArrowRight /></Button>
          ) : (
            <Button variant="saffron" disabled={submitting} onClick={() => submit()}><Send /> Submit test</Button>
          )}
        </div>
      </Panel>
      <div className="space-y-4">
        <Panel className={cn("text-center", left < 60 && "bg-destructive-soft")}>
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Clock className="size-3.5" /> Time left</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums">{mm}:{ss}</p>
        </Panel>
        <Panel>
          <p className="mb-3 text-sm font-semibold">{answered} of {questions.length} answered</p>
          <div className="grid grid-cols-6 gap-1.5">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "aspect-square rounded-md border text-xs font-semibold",
                  i === idx && "ring-2 ring-ring",
                  answers[qq.id] ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button variant="saffron" className="mt-4 w-full" disabled={submitting} onClick={() => { if (confirm("Submit your test now?")) void submit(); }}>
            {submitting ? "Submitting…" : "Submit test"}
          </Button>
        </Panel>
      </div>
    </div>
  );
}
