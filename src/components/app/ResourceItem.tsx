import { useState } from "react";
import { Download, ExternalLink, FileText, PlayCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openSchoolFile } from "@/lib/files";
import { RESOURCE_KINDS, youtubeEmbed, type ResourceKind } from "@/lib/constants";

export type ResourceRow = {
  id: string;
  kind: ResourceKind;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
};

export function ResourceItem({ r, meta, onDelete }: { r: ResourceRow; meta?: string; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const embed = r.kind === "video" && r.url ? youtubeEmbed(r.url) : null;
  const short = RESOURCE_KINDS.find((k) => k.value === r.kind)?.short ?? r.kind;

  async function open_() {
    if (embed) { setOpen(true); return; }
    if (r.file_path) {
      try {
        await openSchoolFile(r.file_path);
      } catch (e) {
        toast.error((e as Error).message);
      }
      return;
    }
    if (r.url) window.open(r.url, "_blank", "noopener");
  }

  const Icon = r.kind === "video" ? PlayCircle : FileText;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{r.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          <Badge variant="secondary" className="mr-1.5 px-1.5 py-0 text-[10px]">{short}</Badge>
          {meta ?? r.description ?? r.file_name ?? ""}
        </p>
      </div>
      <Button size="sm" variant={embed ? "default" : "soft"} onClick={open_}>
        {embed ? <><PlayCircle /> Watch</> : r.file_path ? <><Download /> Open</> : <><ExternalLink /> Open</>}
      </Button>
      {onDelete && (
        <Button size="icon" variant="ghost" aria-label="Delete" onClick={onDelete}>
          <Trash2 className="text-destructive" />
        </Button>
      )}
      {embed && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{r.title}</DialogTitle>
            </DialogHeader>
            <div className="aspect-video overflow-hidden rounded-lg bg-ink">
              {open && <iframe src={embed} title={r.title} className="size-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
            </div>
            {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
