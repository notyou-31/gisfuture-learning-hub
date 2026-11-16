import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Search, ShieldOff, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removeUser } from "@/lib/auth.functions";
import { useMe } from "@/hooks/use-me";
import { usePeople } from "@/hooks/use-people";
import { ROLE_LABEL } from "@/lib/constants";
import { EmptyState, Loading, PageHeader, Panel, RoleGate, StatCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users & sign-ins — GISFuture" }, { name: "description", content: "Manage who can access GISFuture." }] }),
  component: () => (
    <RoleGate roles={["super_admin"]}>
      <UsersPage />
    </RoleGate>
  ),
});

const isOnline = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 3 * 60_000;

function UsersPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const people = usePeople();
  const remove = useServerFn(removeUser);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "super_admin">("all");
  const logins = useQuery({
    queryKey: ["login-events"],
    queryFn: async () => (await supabase.from("login_events").select("*").order("created_at", { ascending: false }).limit(150)).data ?? [],
  });
  const blocked = useQuery({
    queryKey: ["blocked"],
    queryFn: async () => (await supabase.from("blocked_phones").select("*").order("blocked_at", { ascending: false })).data ?? [],
  });

  if (people.isLoading) return <Loading />;
  const all = people.data ?? [];
  const list = all.filter(
    (p) => (roleFilter === "all" || p.role === roleFilter) && (p.full_name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)),
  );
  const online = all.filter((p) => isOnline(p.last_seen_at)).length;

  async function onRemove(id: string, name: string) {
    if (!confirm(`Remove ${name}? They will be signed out and their number will be blocked.`)) return;
    try {
      await remove({ data: { userId: id } });
      toast.success(`${name} removed`);
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["blocked"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function unblock(phone: string) {
    const { error } = await supabase.from("blocked_phones").delete().eq("phone", phone);
    if (error) { toast.error(error.message); return; }
    toast.success("Number unblocked — they can sign in again");
    qc.invalidateQueries({ queryKey: ["blocked"] });
  }

  return (
    <>
      <PageHeader eyebrow="Super admin" title="Users & sign-ins" description="Everyone who has entered GISFuture. Removing someone signs them out and blocks their number." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Online now" value={online} tone="success" />
        <StatCard label="Students" value={all.filter((p) => p.role === "student").length} />
        <StatCard label="Teachers" value={all.filter((p) => p.role === "teacher").length} tone="saffron" />
        <StatCard label="Blocked numbers" value={blocked.data?.length ?? 0} tone="destructive" />
      </div>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="history">Sign-in history</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <div className="my-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or number" className="bg-card pl-9" />
            </div>
            <div className="flex gap-1 rounded-lg border bg-card p-1">
              {(["all", "student", "teacher", "super_admin"] as const).map((r) => (
                <button key={r} onClick={() => setRoleFilter(r)} className={cn("rounded-md px-3 py-1 text-sm", roleFilter === r ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {r === "all" ? "All" : ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <Panel className="overflow-x-auto p-0 sm:p-0">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sign-ins</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3 font-semibold">{p.full_name}<span className="block text-xs font-normal text-muted-foreground">Joined {format(new Date(p.created_at), "d MMM yyyy")}</span></td>
                    <td className="px-4 py-3 tabular-nums">{p.phone}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{p.role ? ROLE_LABEL[p.role] : "—"}</Badge></td>
                    <td className="px-4 py-3">
                      {isOnline(p.last_seen_at) ? (
                        <span className="flex items-center gap-1.5 font-semibold text-success"><span className="size-2 rounded-full bg-success" /> Online</span>
                      ) : (
                        <span className="text-muted-foreground">{p.last_seen_at ? `Seen ${formatDistanceToNowStrict(new Date(p.last_seen_at))} ago` : "Never"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.login_count}</td>
                    <td className="px-4 py-3 text-right">
                      {p.id !== me?.id && (
                        <Button size="sm" variant="ghost" onClick={() => onRemove(p.id, p.full_name)}><UserX className="text-destructive" /> Remove</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No one matches.</p>}
          </Panel>
        </TabsContent>

        <TabsContent value="history">
          <Panel className="mt-4 overflow-x-auto p-0 sm:p-0">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Role</th></tr>
              </thead>
              <tbody>
                {(logins.data ?? []).map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-2.5">{format(new Date(l.created_at), "d MMM, h:mm a")}</td>
                    <td className="px-4 py-2.5">{l.full_name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{l.phone}</td>
                    <td className="px-4 py-2.5">{l.role ? ROLE_LABEL[l.role] : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </TabsContent>

        <TabsContent value="blocked">
          <div className="mt-4">
            {(blocked.data ?? []).length === 0 ? (
              <EmptyState icon={<ShieldOff className="size-5" />} title="No blocked numbers" />
            ) : (
              <div className="space-y-2">
                {(blocked.data ?? []).map((b) => (
                  <div key={b.phone} className="flex items-center justify-between rounded-xl border bg-card p-4">
                    <div>
                      <p className="font-semibold">{b.full_name ?? "Unknown"} · <span className="tabular-nums">{b.phone}</span></p>
                      <p className="text-xs text-muted-foreground">Blocked {format(new Date(b.blocked_at), "d MMM yyyy")}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => unblock(b.phone)}>Unblock</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
