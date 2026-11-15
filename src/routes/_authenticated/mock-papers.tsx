import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileStack } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/hooks/use-catalog";
import { EmptyState, Loading, PageHeader } from "@/components/app/ui";
import { ResourceItem } from "@/components/app/ResourceItem";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/mock-papers")({
  head: () => ({ meta: [{ title: "Full mock papers — GISFuture" }, { name: "description", content: "Full-length Class 10 mock papers." }] }),
  component: MockPapers,
});

function MockPapers() {
  const { subjectName } = useCatalog();
  const q = useQuery({
    queryKey: ["resources", "mock"],
    queryFn: async () => (await supabase.from("resources").select("*").eq("kind", "mock").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <>
      <PageHeader eyebrow="Exam practice" title="Full mock papers" description="Full-length papers uploaded by your teachers. Time yourself like the real board exam." />
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<FileStack className="size-5" />} title="No mock papers yet" text="They'll appear here as soon as they are uploaded." />
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((r) => (
            <ResourceItem key={r.id} r={r} meta={`${r.subject_id ? subjectName[r.subject_id] : "All subjects"} · ${format(new Date(r.created_at), "d MMM yyyy")}`} />
          ))}
        </div>
      )}
    </>
  );
}
