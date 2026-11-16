import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isStaffRole, useMe } from "@/hooks/use-me";
import { EmptyState, Field, Loading, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — GISFuture" }, { name: "description", content: "School announcements." }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { data: me } = useMe();
  const staff = isStaffRole(me?.role);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["announcements", "all"],
    queryFn: async () =>
      (await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false })).data ?? [],
  });
  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }
  async function togglePin(id: string, pinned: boolean) {
    await supabase.from("announcements").update({ is_pinned: !pinned }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }
  return (
    <>
      <PageHeader eyebrow="School board" title="Announcements" description="News and notices from school." actions={staff && <AddAnnouncement />} />
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<Megaphone className="size-5" />} title="No announcements yet" />
      ) : (
        <div className="space-y-4">
          {(q.data ?? []).map((a) => (
            <Panel key={a.id} className={cn(a.is_pinned && "border-saffron bg-saffron-soft/40")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "EEEE, d MMM yyyy")}</p>
                  <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">{a.is_pinned && <Pin className="size-4 text-saffron" />}{a.title}</h2>
                </div>
                {staff && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label={a.is_pinned ? "Unpin" : "Pin"} onClick={() => togglePin(a.id, a.is_pinned)}><Pin /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(a.id)}><Trash2 className="text-destructive" /></Button>
                  </div>
                )}
              </div>
              {a.body && <p className="mt-3 whitespace-pre-wrap text-foreground/85">{a.body}</p>}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

function AddAnnouncement() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("announcements").insert({ title, body: body || null, is_pinned: pinned, created_by: me?.id ?? null });
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted");
    qc.invalidateQueries({ queryKey: ["announcements"] });
    setOpen(false); setTitle(""); setBody(""); setPinned(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> New announcement</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Field label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Message"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm"><Switch checked={pinned} onCheckedChange={setPinned} /> Pin to top</label>
          <Button type="submit" className="w-full">Post</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
