import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalog } from "@/hooks/use-catalog";

export function SubjectSelect({ value, onChange, allowNone = true, noneLabel = "All subjects" }: { value: string; onChange: (v: string) => void; allowNone?: boolean; noneLabel?: string }) {
  const { subjects } = useCatalog();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ChapterSelect({ subjectId, value, onChange }: { subjectId: string; value: string; onChange: (v: string) => void }) {
  const { chapters } = useCatalog();
  const list = chapters.filter((c) => c.subject_id === subjectId);
  return (
    <Select value={value} onValueChange={onChange} disabled={!subjectId || subjectId === "none"}>
      <SelectTrigger><SelectValue placeholder="Choose chapter" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Whole subject (no chapter)</SelectItem>
        {list.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export const orNull = (v: string) => (v && v !== "none" ? v : null);
