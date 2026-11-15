import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isStaffRole, useMe } from "@/hooks/use-me";
import { useCatalog } from "@/hooks/use-catalog";
import { EmptyState, Field, Loading, PageHeader } from "@/components/app/ui";
import { SubjectSelect, orNull } from "@/components/app/SubjectSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Upcoming exams — GISFuture" }, { name: "description", content: "Exam schedule for Class 10." }] }),
  component: ExamsPage,
});

function ExamsPage() {
  const { data: me } = useMe();
  const staff = isStaffRole(me?.role);
  const { subjectName } = useCatalog();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["exams", "all"],
    queryFn: async () => (await supabase.from("exams").select("*").order("exam_date")).data ?? [],
  });
  const today = startOfDay(new Date());
  const list = q.data ?? [];
  const upcoming = list.filter((e) => !isBefore(new Date(e.exam_date + "T00:00:00"), today));
  const past = list.filter((e) => isBefore(new Date(e.exam_date + "T00:00:00"), today)).reverse();

  async function remove(id: string) {
    if (!confirm("Delete this exam?")) return;
    await supabase.from("exams").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["exams"] });
  }

  const Row = ({ e, faded }: { e: (typeof list)[number]; faded?: boolean }) => {
    const d = new Date(e.exam_date + "T00:00:00");
    return (
      <div className={cn("flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-soft", faded && "opacity-60")}>
        <div className="grid w-16 shrink-0 place-items-center rounded-xl bg-saffron-soft py-2 text-saffron-foreground">
          <span className="text-xs font-semibold uppercase">{format(d, "MMM")}</span>
          <span className="font-display text-2xl font-bold leading-none">{format(d, "d")}</span>
          <span className="text-[10px]">{format(d, "EEE")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{e.subject_id ? subjectName[e.subject_id] : "All subjects"}{e.start_time ? ` · ${e.start_time}` : ""}</p>
          <h3 className="text-lg font-semibold">{e.title}</h3>
          {e.syllabus && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{e.syllabus}</p>}
        </div>
        {staff && <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(e.id)}><Trash2 className="text-destructive" /></Button>}
      </div>
    );
  };

  return (
    <>
      <PageHeader eyebrow="School board" title="Upcoming exams" description="Dates, timings and syllabus for your exams." actions={staff && <AddExam />} />
      {q.isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="No exams scheduled" />
      ) : (
        <div className="space-y-3">
          {upcoming.map((e) => <Row key={e.id} e={e} />)}
          {past.length > 0 && <h2 className="pt-6 text-lg font-semibold text-muted-foreground">Past exams</h2>}
          {past.map((e) => <Row key={e.id} e={e} faded />)}
        </div>
      )}
    </>
  );
}

function AddExam() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", subject: "none", date: "", time: "", syllabus: "" });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("exams").insert({
      title: f.title, subject_id: orNull(f.subject), exam_date: f.date, start_time: f.time || null, syllabus: f.syllabus || null, created_by: me?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Exam added");
    qc.invalidateQueries({ queryKey: ["exams"] });
    setOpen(false);
    setF({ title: "", subject: "none", date: "", time: "", syllabus: "" });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Add exam</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule an exam</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Field label="Exam name"><Input required placeholder="e.g. Pre-board 1 — Mathematics" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Subject"><SubjectSelect value={f.subject} onChange={(v) => setF({ ...f, subject: v })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input required type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Time (optional)"><Input placeholder="9:30 AM" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          </div>
          <Field label="Syllabus / notes"><Textarea rows={3} value={f.syllabus} onChange={(e) => setF({ ...f, syllabus: e.target.value })} /></Field>
          <Button type="submit" className="w-full">Save exam</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
