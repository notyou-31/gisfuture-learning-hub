import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, startOfDay } from "date-fns";
import { Download, ExternalLink, NotebookPen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isStaffRole, useMe } from "@/hooks/use-me";
import { useCatalog } from "@/hooks/use-catalog";
import { openSchoolFile, removeSchoolFile, uploadSchoolFile } from "@/lib/files";
import { EmptyState, Field, Loading, PageHeader, Panel } from "@/components/app/ui";
import { SubjectSelect, orNull } from "@/components/app/SubjectSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({ meta: [{ title: "Homework — GISFuture" }, { name: "description", content: "Homework from your teachers." }] }),
  component: HomeworkPage,
});

function HomeworkPage() {
  const { data: me } = useMe();
  const staff = isStaffRole(me?.role);
  const { subjectName } = useCatalog();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["homework", "all"],
    queryFn: async () => (await supabase.from("homework").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function remove(id: string, path: string | null) {
    if (!confirm("Delete this homework?")) return;
    await supabase.from("homework").delete().eq("id", id);
    await removeSchoolFile(path);
    qc.invalidateQueries({ queryKey: ["homework"] });
  }

  return (
    <>
      <PageHeader eyebrow="School board" title="Homework" description="Assignments set by your teachers." actions={staff && <AddHomework />} />
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<NotebookPen className="size-5" />} title="No homework" text="Enjoy the break — nothing assigned right now." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(q.data ?? []).map((h) => {
            const due = h.due_date ? new Date(h.due_date + "T00:00:00") : null;
            const overdue = due && isBefore(due, startOfDay(new Date()));
            return (
              <Panel key={h.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{h.subject_id ? subjectName[h.subject_id] : "General"}</p>
                    <h2 className="mt-1 text-lg font-semibold">{h.title}</h2>
                  </div>
                  {due && <Badge variant={overdue ? "destructive" : "secondary"}>Due {format(due, "d MMM")}</Badge>}
                </div>
                {h.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{h.description}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {h.file_path && <Button size="sm" variant="soft" onClick={() => openSchoolFile(h.file_path!).catch((e) => toast.error(e.message))}><Download /> {h.file_name ?? "Attachment"}</Button>}
                  {h.link_url && <Button size="sm" variant="outline" asChild><a href={h.link_url} target="_blank" rel="noreferrer"><ExternalLink /> Link</a></Button>}
                  {staff && <Button size="sm" variant="ghost" onClick={() => remove(h.id, h.file_path)}><Trash2 className="text-destructive" /> Delete</Button>}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}

function AddHomework() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subject, setSubject] = useState("none");
  const [due, setDue] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const up = file ? await uploadSchoolFile(file, "homework") : null;
      const { error } = await supabase.from("homework").insert({
        title, description: desc || null, subject_id: orNull(subject), due_date: due || null, link_url: link || null,
        file_path: up?.path ?? null, file_name: up?.name ?? null, created_by: me?.id ?? null,
      });
      if (error) throw error;
      toast.success("Homework posted");
      qc.invalidateQueries({ queryKey: ["homework"] });
      setOpen(false); setTitle(""); setDesc(""); setDue(""); setLink(""); setFile(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Add homework</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New homework</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Field label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject"><SubjectSelect value={subject} onChange={setSubject} noneLabel="General" /></Field>
            <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          </div>
          <Field label="Instructions"><Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Attachment (optional)"><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="Link (optional)"><Input type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} /></Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Posting…" : "Post homework"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
