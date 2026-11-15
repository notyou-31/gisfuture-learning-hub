import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Atom, BookOpen, Calculator, Globe2, Languages, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/hooks/use-catalog";
import { Loading, PageHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({ meta: [{ title: "My subjects — GISFuture" }, { name: "description", content: "Class 10 subjects and chapter-wise resources." }] }),
  component: SubjectsPage,
});

const ICONS: Record<string, typeof BookOpen> = {
  maths: Calculator, science: Atom, "social-science": Globe2, english: BookOpen, hindi: Languages, it: Monitor,
};

function SubjectsPage() {
  const { subjects, chapters, isLoading } = useCatalog();
  const counts = useQuery({
    queryKey: ["resource-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("subject_id");
      const m: Record<string, number> = {};
      data?.forEach((r) => r.subject_id && (m[r.subject_id] = (m[r.subject_id] ?? 0) + 1));
      return m;
    },
  });
  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader eyebrow="Class 10" title="My subjects" description="Open a subject for chapter-wise notes, videos, NCERT solutions, important questions and more." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s, i) => {
          const Icon = ICONS[s.slug] ?? BookOpen;
          const ch = chapters.filter((c) => c.subject_id === s.id).length;
          return (
            <Link
              key={s.id}
              to="/subjects/$subjectId"
              params={{ subjectId: s.id }}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift animate-rise"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-saffron-soft transition-transform group-hover:scale-125" />
              <div className="relative">
                <div className="mb-5 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <h2 className="text-2xl font-semibold">{s.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ch} chapters · {counts.data?.[s.id] ?? 0} resources
                </p>
                <p className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary">
                  Open subject <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
