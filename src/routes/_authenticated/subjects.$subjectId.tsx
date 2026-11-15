import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/hooks/use-catalog";
import { RESOURCE_KINDS, type ResourceKind } from "@/lib/constants";
import { EmptyState, Loading, PageHeader } from "@/components/app/ui";
import { ResourceItem } from "@/components/app/ResourceItem";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/subjects/$subjectId")({
  head: () => ({ meta: [{ title: "Subject — GISFuture" }, { name: "description", content: "Chapter-wise resources for this subject." }] }),
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const { subjects, chapters, isLoading } = useCatalog();
  const [kind, setKind] = useState<ResourceKind | "all">("all");
  const resources = useQuery({
    queryKey: ["resources", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*").eq("subject_id", subjectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading || resources.isLoading) return <Loading />;
  const subject = subjects.find((s) => s.id === subjectId);
  const chs = chapters.filter((c) => c.subject_id === subjectId);
  const all = (resources.data ?? []).filter((r) => kind === "all" || r.kind === kind);
  const general = all.filter((r) => !r.chapter_id);

  return (
    <>
      <Link to="/subjects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All subjects
      </Link>
      <PageHeader eyebrow="Subject" title={subject?.name ?? "Subject"} description="Pick a chapter to see everything your teachers have shared." />

      <div className="mb-6 flex flex-wrap gap-2">
        {[{ value: "all" as const, short: "Everything" }, ...RESOURCE_KINDS].map((k) => (
          <button
            key={k.value}
            onClick={() => setKind(k.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              kind === k.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
            )}
          >
            {"label" in k ? k.label : k.short}
          </button>
        ))}
      </div>

      {general.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-lg font-semibold">Whole-subject material</h2>
          {general.map((r) => <ResourceItem key={r.id} r={r} />)}
        </div>
      )}

      {chs.length === 0 && all.length === 0 ? (
        <EmptyState icon={<FolderOpen className="size-5" />} title="Nothing here yet" text="Your teachers haven't added material for this subject yet." />
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {chs.map((c, i) => {
            const items = all.filter((r) => r.chapter_id === c.id);
            return (
              <AccordionItem key={c.id} value={c.id} className="rounded-2xl border bg-card px-5 shadow-soft">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-3 text-left">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron-soft font-display text-sm font-bold text-saffron-foreground">{i + 1}</span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{items.length} items</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {items.length === 0 ? (
                    <p className="pb-2 text-sm text-muted-foreground">No material for this chapter yet.</p>
                  ) : (
                    <div className="space-y-2 pb-2">{items.map((r) => <ResourceItem key={r.id} r={r} />)}</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </>
  );
}
