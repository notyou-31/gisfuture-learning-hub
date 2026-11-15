import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { useCatalog } from "@/hooks/use-catalog";
import { EmptyState, Field, Loading, PageHeader, RoleGate } from "@/components/app/ui";
import { ChapterSelect, SubjectSelect, orNull } from "@/components/app/SubjectSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/teach/tests/")({
  head: () => ({ meta: [{ title: "Create tests — GISFuture" }, { name: "description", content: "Create MCQ and integer-type tests." }] }),
  component: () => (
    <RoleGate roles={["teacher", "super_admin"]}>
      <ManageTests />
    </RoleGate>
  ),
});

function ManageTests() {
  const { subjectName, chapterName } = useCatalog();
  const q = useQuery({
    queryKey: ["tests", "manage"],
    queryFn: async () => (await supabase.from("tests").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <>
      <PageHeader eyebrow="Teaching" title="Tests" description="Create MCQ and integer-answer tests, then publish them for students." actions={<NewTest />} />
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<GraduationCap className="size-5" />} title="No tests yet" text="Create your first test to get started." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Test</th><th className="hidden px-4 py-3 md:table-cell">Subject</th><th className="px-4 py-3">Questions</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 font-semibold">{t.title}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{t.subject_id ? subjectName[t.subject_id] : "General"}{t.chapter_id ? ` · ${chapterName[t.chapter_id]}` : ""}</td>
                  <td className="px-4 py-3">{t.question_count} · {Number(t.total_marks)} marks</td>
                  <td className="px-4 py-3">{t.is_published ? <Badge className="bg-success text-primary-foreground">Published</Badge> : <Badge variant="secondary">Draft</Badge>}</td>
                  <td className="px-4 py-3 text-right"><Button asChild size="sm" variant="soft"><Link to="/teach/tests/$testId" params={{ testId: t.id }}>Edit</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function NewTest() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", subject: "none", chapter: "none", duration: "30" });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("tests")
      .insert({
        title: f.title, description: f.description || null, subject_id: orNull(f.subject), chapter_id: orNull(f.chapter),
        duration_minutes: Math.max(1, parseInt(f.duration) || 30), created_by: me?.id,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    navigate({ to: "/teach/tests/$testId", params: { testId: data.id } });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> New test</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New test</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Field label="Title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Quadratic Equations — Quiz 1" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject"><SubjectSelect value={f.subject} onChange={(v) => setF({ ...f, subject: v, chapter: "none" })} noneLabel="General" /></Field>
            <Field label="Chapter"><ChapterSelect subjectId={f.subject} value={f.chapter} onChange={(v) => setF({ ...f, chapter: v })} /></Field>
          </div>
          <Field label="Duration (minutes)"><Input type="number" min={1} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></Field>
          <Field label="Instructions (optional)"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Button type="submit" className="w-full">Create & add questions</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
