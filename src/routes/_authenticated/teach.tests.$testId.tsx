import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { EmptyState, Field, Loading, PageHeader, Panel, RoleGate } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Question = Database["public"]["Tables"]["questions"]["Row"];

export const Route = createFileRoute("/_authenticated/teach/tests/$testId")({
  head: () => ({ meta: [{ title: "Edit test — GISFuture" }, { name: "description", content: "Add questions and publish." }] }),
  component: () => (
    <RoleGate roles={["teacher", "super_admin"]}>
      <EditTest />
    </RoleGate>
  ),
});

function EditTest() {
  const { testId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const test = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => (await supabase.from("tests").select("*").eq("id", testId).single()).data,
  });
  const qs = useQuery({
    queryKey: ["questions", testId],
    queryFn: async () => (await supabase.from("questions").select("*").eq("test_id", testId).order("sort").order("created_at")).data ?? [],
  });
  const [editing, setEditing] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["questions", testId] });
    qc.invalidateQueries({ queryKey: ["test", testId] });
    qc.invalidateQueries({ queryKey: ["tests"] });
  };

  if (test.isLoading || qs.isLoading) return <Loading />;
  if (!test.data) return <EmptyState title="Test not found" />;
  const t = test.data;

  async function togglePublish() {
    if (!t.is_published && (qs.data ?? []).length === 0) return toast.error("Add at least one question first");
    const { error } = await supabase.from("tests").update({ is_published: !t.is_published }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(t.is_published ? "Test moved to draft" : "Test published for students");
    refresh();
  }
  async function deleteTest() {
    if (!confirm("Delete this test and all its results?")) return;
    await supabase.from("tests").delete().eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["tests"] });
    navigate({ to: "/teach/tests" });
  }
  async function removeQ(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    refresh();
  }

  return (
    <>
      <Link to="/teach/tests" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All tests</Link>
      <PageHeader
        eyebrow={t.is_published ? "Published" : "Draft"}
        title={t.title}
        description={`${t.question_count} questions · ${Number(t.total_marks)} marks · ${t.duration_minutes} minutes`}
        actions={
          <>
            <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm">
              <Switch checked={t.is_published} onCheckedChange={togglePublish} /> Visible to students
            </label>
            <Button variant="ghost" onClick={deleteTest}><Trash2 className="text-destructive" /> Delete</Button>
          </>
        }
      />
      <TestSettings t={t} onSaved={refresh} />
      <div className="mt-6 space-y-4">
        {(qs.data ?? []).map((q, i) =>
          editing === q.id ? (
            <QuestionForm key={q.id} testId={testId} initial={q} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
          ) : (
            <Panel key={q.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  Q{i + 1} · {q.qtype === "mcq" ? "MCQ" : "Integer"} · +{Number(q.marks)}{Number(q.negative_marks) ? ` / −${Number(q.negative_marks)}` : ""}
                </p>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(q.id)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => removeQ(q.id)}><Trash2 className="text-destructive" /></Button>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap font-medium">{q.prompt}</p>
              {q.qtype === "mcq" ? (
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {(q.options as string[]).map((o, oi) => (
                    <li key={oi} className={cn("rounded-lg border px-3 py-1.5 text-sm", q.correct_index === oi && "border-success bg-success-soft font-semibold")}>
                      {String.fromCharCode(65 + oi)}. {o}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm">Answer: <b className="text-success">{q.correct_value}</b></p>
              )}
            </Panel>
          ),
        )}
        {editing === null && <QuestionForm testId={testId} nextSort={(qs.data ?? []).length} onDone={refresh} />}
      </div>
    </>
  );
}

function TestSettings({ t, onSaved }: { t: Database["public"]["Tables"]["tests"]["Row"]; onSaved: () => void }) {
  const [title, setTitle] = useState(t.title);
  const [duration, setDuration] = useState(String(t.duration_minutes));
  const [desc, setDesc] = useState(t.description ?? "");
  useEffect(() => { setTitle(t.title); setDuration(String(t.duration_minutes)); setDesc(t.description ?? ""); }, [t]);
  async function save() {
    const { error } = await supabase.from("tests").update({ title, description: desc || null, duration_minutes: Math.max(1, parseInt(duration) || 30) }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }
  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Minutes"><Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
      </div>
      <div className="mt-3"><Field label="Instructions"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field></div>
      <Button variant="outline" className="mt-3" onClick={save}>Save details</Button>
    </Panel>
  );
}

function QuestionForm({ testId, initial, nextSort = 0, onDone, onCancel }: { testId: string; initial?: Question; nextSort?: number; onDone: () => void; onCancel?: () => void }) {
  const [qtype, setQtype] = useState<"mcq" | "integer">(initial?.qtype ?? "mcq");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [options, setOptions] = useState<string[]>((initial?.options as string[]) ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState<number>(initial?.correct_index ?? 0);
  const [value, setValue] = useState(initial?.correct_value != null ? String(initial.correct_value) : "");
  const [marks, setMarks] = useState(String(initial?.marks ?? 4));
  const [neg, setNeg] = useState(String(initial?.negative_marks ?? 1));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (qtype === "mcq" && opts.length < 2) return toast.error("Add at least two options");
    if (qtype === "mcq" && !options[correct]?.trim()) return toast.error("Mark the correct option");
    if (qtype === "integer" && (value === "" || isNaN(Number(value)))) return toast.error("Enter the correct numeric answer");
    // re-index correct option after dropping blanks
    const correctIdx = qtype === "mcq" ? opts.indexOf(options[correct].trim()) : null;
    const row = {
      test_id: testId, qtype, prompt,
      options: qtype === "mcq" ? opts : [],
      correct_index: correctIdx,
      correct_value: qtype === "integer" ? Number(value) : null,
      marks: Number(marks) || 0, negative_marks: Number(neg) || 0,
      explanation: explanation || null,
    };
    setBusy(true);
    const { error } = initial
      ? await supabase.from("questions").update(row).eq("id", initial.id)
      : await supabase.from("questions").insert({ ...row, sort: nextSort });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Question updated" : "Question added");
    if (!initial) { setPrompt(""); setOptions(["", "", "", ""]); setCorrect(0); setValue(""); setExplanation(""); }
    onDone();
  }

  return (
    <Panel className="border-primary/40">
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit question" : "Add a question"}</h2>
          <div className="flex rounded-lg border p-0.5">
            {(["mcq", "integer"] as const).map((t) => (
              <button type="button" key={t} onClick={() => setQtype(t)} className={cn("rounded-md px-3 py-1 text-sm", qtype === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {t === "mcq" ? "MCQ" : "Integer"}
              </button>
            ))}
          </div>
        </div>
        <Field label="Question"><Textarea required rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
        {qtype === "mcq" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Options <span className="font-normal text-muted-foreground">— tap the circle to mark the correct one</span></p>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button type="button" aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`} onClick={() => setCorrect(i)}
                  className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold", correct === i && "border-success bg-success text-primary-foreground")}>
                  {correct === i ? <Check className="size-4" /> : String.fromCharCode(65 + i)}
                </button>
                <Input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                {options.length > 2 && (
                  <Button type="button" size="icon" variant="ghost" aria-label="Remove option" onClick={() => { setOptions(options.filter((_, j) => j !== i)); if (correct >= i && correct > 0) setCorrect(correct - 1); }}><X /></Button>
                )}
              </div>
            ))}
            {options.length < 6 && <Button type="button" size="sm" variant="ghost" onClick={() => setOptions([...options, ""])}><Plus /> Add option</Button>}
          </div>
        ) : (
          <Field label="Correct answer (number)"><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-xs" /></Field>
        )}
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <Field label="Marks if correct"><Input type="number" step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} /></Field>
          <Field label="Minus if wrong"><Input type="number" step="0.25" min={0} value={neg} onChange={(e) => setNeg(e.target.value)} /></Field>
        </div>
        <Field label="Explanation (shown after submitting)"><Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} /></Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{initial ? "Save question" : <><Plus /> Add question</>}</Button>
          {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
      </form>
    </Panel>
  );
}
