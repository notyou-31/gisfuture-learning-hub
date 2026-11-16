import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { usePeople } from "@/hooks/use-people";
import { EmptyState, Loading, PageHeader, Panel, RoleGate } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/attempts")({
  head: () => ({ meta: [{ title: "Reattempts — GISFuture" }, { name: "description", content: "Let students reattempt a test." }] }),
  component: () => (
    <RoleGate roles={["super_admin"]}>
      <AttemptsPage />
    </RoleGate>
  ),
});

function AttemptsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { byId } = usePeople();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["attempts", "admin"],
    queryFn: async () =>
      (await supabase.from("attempts").select("*, tests(title)").eq("archived", false).order("submitted_at", { ascending: false }).limit(500)).data ?? [],
  });
  if (q.isLoading) return <Loading />;
  const rows = (q.data ?? []).filter((a) => {
    const s = search.toLowerCase();
    return !s || (byId[a.user_id]?.full_name ?? "").toLowerCase().includes(s) || (a.tests?.title ?? "").toLowerCase().includes(s) || (byId[a.user_id]?.phone ?? "").includes(s);
  });

  async function allow(id: string, name: string) {
    if (!confirm(`Allow ${name} to take this test again? Their current score will be cleared from the leaderboard.`)) return;
    const { error } = await supabase.from("attempts").update({ archived: true, archived_at: new Date().toISOString(), archived_by: me?.id ?? null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Reattempt allowed");
    qc.invalidateQueries({ queryKey: ["attempts"] });
  }

  return (
    <>
      <PageHeader eyebrow="Super admin" title="Reattempts" description="Reset a student's attempt so they can take the test again." />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, number or test" className="bg-card pl-9" />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<RotateCcw className="size-5" />} title="No attempts found" />
      ) : (
        <Panel className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Test</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3 text-right">Marks</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const name = byId[a.user_id]?.full_name ?? "Student";
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-3 font-semibold">{name}<span className="block text-xs font-normal text-muted-foreground">{byId[a.user_id]?.phone}</span></td>
                    <td className="px-4 py-3">{a.tests?.title}</td>
                    <td className="px-4 py-3">{format(new Date(a.submitted_at), "d MMM, h:mm a")}</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(a.score)} / {Number(a.max_score)}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => allow(a.id, name)}><RotateCcw /> Allow reattempt</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
