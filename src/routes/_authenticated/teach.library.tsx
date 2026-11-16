import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LibraryBig, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { useCatalog } from "@/hooks/use-catalog";
import { RESOURCE_KINDS, type ResourceKind } from "@/lib/constants";
import { removeSchoolFile, uploadSchoolFile } from "@/lib/files";
import { EmptyState, Field, Loading, PageHeader, Panel, RoleGate } from "@/components/app/ui";
import { ChapterSelect, SubjectSelect, orNull } from "@/components/app/SubjectSelect";
import { ResourceItem } from "@/components/app/ResourceItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/teach/library")({
  head: () => ({ meta: [{ title: "Upload material — GISFuture" }, { name: "description", content: "Upload PDFs, notes and videos." }] }),
  component: () => (
    <RoleGate roles={["teacher", "super_admin"]}>
      <LibraryPage />
    </RoleGate>
  ),
});

function LibraryPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { subjects, subjectName, chapterName } = useCatalog();
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("none");
  const [kind, setKind] = useState<ResourceKind>("notes");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [newChapter, setNewChapter] = useState("");
  const [filter, setFilter] = useState("all");

  const list = useQuery({
    queryKey: ["resources", "manage"],
    queryFn: async () => (await supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [],
  });

  const isVideo = kind === "video";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subject) { toast.error("Choose a subject"); return; }
    if (isVideo && !url) { toast.error("Paste the YouTube link"); return; }
    if (!isVideo && !file && !url) { toast.error("Upload a file or add a link"); return; }
    setBusy(true);
    try {
      const up = !isVideo && file ? await uploadSchoolFile(file, `resources/${kind}`) : null;
      const { error } = await supabase.from("resources").insert({
        subject_id: subject, chapter_id: orNull(chapter), kind, title, description: desc || null,
        url: url || null, file_path: up?.path ?? null, file_name: up?.name ?? null, created_by: me?.id ?? null,
      });
      if (error) throw error;
      toast.success("Material added");
      setTitle(""); setDesc(""); setUrl(""); setFile(null);
      setFileKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ["resources"] });
      qc.invalidateQueries({ queryKey: ["resource-counts"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addChapter() {
    if (!subject || !newChapter.trim()) return;
    const { error } = await supabase.from("chapters").insert({ subject_id: subject, name: newChapter.trim(), sort: 999 });
    if (error) { toast.error(error.message); return; }
    setNewChapter("");
    toast.success("Chapter added");
    qc.invalidateQueries({ queryKey: ["chapters"] });
  }

  async function remove(id: string, path: string | null) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("resources").delete().eq("id", id);
    await removeSchoolFile(path);
    qc.invalidateQueries({ queryKey: ["resources"] });
  }

  const rows = (list.data ?? []).filter((r) => filter === "all" || r.subject_id === filter);

  return (
    <>
      <PageHeader eyebrow="Teaching" title="Upload material" description="Add notes, PDFs, NCERT solutions, important questions, revision sheets, practice exercises, full mock papers and YouTube lectures." />
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Panel>
            <form onSubmit={save} className="space-y-3">
              <h2 className="flex items-center gap-2 text-xl font-semibold"><Upload className="size-5 text-primary" /> New item</h2>
              <Field label="Type">
                <Select value={kind} onValueChange={(v) => setKind(v as ResourceKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RESOURCE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Subject"><SubjectSelect value={subject} onChange={(v) => { setSubject(v); setChapter("none"); }} allowNone={false} /></Field>
              <Field label="Chapter"><ChapterSelect subjectId={subject} value={chapter} onChange={setChapter} /></Field>
              <Field label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Real Numbers — class notes" /></Field>
              <Field label="Description (optional)"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
              {isVideo ? (
                <Field label="YouTube link"><Input type="url" required placeholder="https://youtu.be/…" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
              ) : (
                <>
                  <Field label="File (PDF, image, doc)" hint="Up to 50 MB"><Input key={fileKey} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
                  <Field label="…or a link (optional)"><Input type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
                </>
              )}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Uploading…" : "Add to library"}</Button>
            </form>
          </Panel>
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">Add a chapter</h2>
            <p className="mb-3 text-sm text-muted-foreground">Pick a subject above, then name the new chapter.</p>
            <div className="flex gap-2">
              <Input value={newChapter} onChange={(e) => setNewChapter(e.target.value)} placeholder="Chapter name" disabled={!subject} />
              <Button type="button" variant="outline" onClick={addChapter} disabled={!subject}><Plus /> Add</Button>
            </div>
          </Panel>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Library</h2>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {list.isLoading ? <Loading /> : rows.length === 0 ? (
            <EmptyState icon={<LibraryBig className="size-5" />} title="Nothing uploaded yet" />
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <ResourceItem
                  key={r.id}
                  r={r}
                  meta={`${r.subject_id ? subjectName[r.subject_id] : ""}${r.chapter_id ? ` · ${chapterName[r.chapter_id]}` : ""}`}
                  onDelete={() => remove(r.id, r.file_path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
