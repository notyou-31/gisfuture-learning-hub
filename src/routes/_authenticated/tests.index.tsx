import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { myAttemptsQuery, publishedTestsQuery, useCatalog } from "@/hooks/use-catalog";
import { EmptyState, Loading, PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tests/")({
  head: () => ({ meta: [{ title: "Tests — GISFuture" }, { name: "description", content: "MCQ and integer-type tests." }] }),
  component: TestsPage,
});

function TestsPage() {
  const { data: me } = useMe();
  const tests = useQuery(publishedTestsQuery);
  const attempts = useQuery({ ...myAttemptsQuery(me?.id ?? ""), enabled: !!me });
  const { subjectName, chapterName } = useCatalog();
  if (tests.isLoading || attempts.isLoading) return <Loading />;
  const byTest = new Map((attempts.data ?? []).filter((a) => !a.archived).map((a) => [a.test_id, a]));
  const list = (tests.data ?? []).filter((t) => t.question_count > 0);

  return (
    <>
      <PageHeader eyebrow="Assessments" title="Tests" description="Each test can be attempted once. Your marks appear instantly after you submit." />
      {list.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-5" />} title="No tests yet" text="Your teachers haven't published any tests." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((t) => {
            const a = byTest.get(t.id);
            return (
              <div key={t.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {t.subject_id ? subjectName[t.subject_id] : "General"}
                  {t.chapter_id ? ` · ${chapterName[t.chapter_id]}` : ""}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{t.title}</h2>
                {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
                <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t.question_count} questions</span>
                  <span>{Number(t.total_marks)} marks</span>
                  <span className="flex items-center gap-1"><Clock className="size-3.5" />{t.duration_minutes} min</span>
                </p>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  {a ? (
                    <>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                        <CheckCircle2 className="size-4" /> {Number(a.score)} / {Number(a.max_score)}
                      </span>
                      <Button asChild size="sm" variant="soft"><Link to="/results/$attemptId" params={{ attemptId: a.id }}>View result</Link></Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground">Not attempted</span>
                      <Button asChild size="sm"><Link to="/tests/$testId" params={{ testId: t.id }}>Start test</Link></Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
