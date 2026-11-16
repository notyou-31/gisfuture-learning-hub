import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type AppRole } from "@/lib/constants";
import { Field, Loading, PageHeader, Panel, RoleGate } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/passkeys")({
  head: () => ({ meta: [{ title: "Passkeys — GISFuture" }, { name: "description", content: "Create and change sign-in passkeys." }] }),
  component: () => (
    <RoleGate roles={["super_admin"]}>
      <PasskeysPage />
    </RoleGate>
  ),
});

function genCode(role: AppRole) {
  const prefix = role === "teacher" ? "TCH" : role === "student" ? "STU" : "ADM";
  const n = crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36).toUpperCase().slice(0, 6);
  return `${prefix}-${n}`;
}

function PasskeysPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => (await supabase.from("passkeys").select("*").order("created_at")).data ?? [],
  });
  const [role, setRole] = useState<AppRole>("student");
  const [code, setCode] = useState(genCode("student"));
  const [label, setLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["passkeys"] });
  const keys = q.data ?? [];
  const activeAdminKeys = keys.filter((k) => k.role === "super_admin" && k.is_active).length;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("passkeys").insert({ role, code: code.trim(), label: label || null });
    if (error) { toast.error(error.code === "23505" ? "That passkey is already in use. Every key must be different." : error.message); return; }
    toast.success("Passkey created");
    setCode(genCode(role)); setLabel("");
    refresh();
  }
  async function saveEdit(id: string) {
    if (editCode.trim().length < 4) { toast.error("Use at least 4 characters"); return; }
    const { error } = await supabase.from("passkeys").update({ code: editCode.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.code === "23505" ? "That passkey is already in use." : error.message); return; }
    toast.success("Passkey changed");
    setEditId(null);
    refresh();
  }
  async function toggle(k: (typeof keys)[number]) {
    if (k.role === "super_admin" && k.is_active && activeAdminKeys <= 1) { toast.error("Keep at least one active super admin key"); return; }
    await supabase.from("passkeys").update({ is_active: !k.is_active }).eq("id", k.id);
    refresh();
  }
  async function remove(k: (typeof keys)[number]) {
    if (k.role === "super_admin" && k.is_active && activeAdminKeys <= 1) { toast.error("Keep at least one active super admin key"); return; }
    if (!confirm("Delete this passkey? People already signed up keep their accounts, but can't sign in with this key again.")) return;
    await supabase.from("passkeys").delete().eq("id", k.id);
    refresh();
  }

  if (q.isLoading) return <Loading />;

  return (
    <>
      <PageHeader eyebrow="Super admin" title="Passkeys" description="Everyone needs a passkey to sign in. Students and teachers use different keys — the key decides their role on first sign-in." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel>
          <form onSubmit={create} className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Plus className="size-5 text-primary" /> New passkey</h2>
            <Field label="For">
              <Select value={role} onValueChange={(v) => { setRole(v as AppRole); setCode(genCode(v as AppRole)); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Passkey" hint="At least 4 characters. Must be different from every other key.">
              <Input required minLength={4} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Label (optional)"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Section A 2026" /></Field>
            <Button type="submit" className="w-full">Create passkey</Button>
          </form>
        </Panel>
        <div className="space-y-6">
          {(["student", "teacher", "super_admin"] as AppRole[]).map((r) => {
            const list = keys.filter((k) => k.role === r);
            return (
              <div key={r}>
                <h2 className="mb-2 text-lg font-semibold">{ROLE_LABEL[r]} keys</h2>
                {list.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No {ROLE_LABEL[r].toLowerCase()} keys yet.</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((k) => (
                      <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-soft">
                        <KeyRound className="size-5 text-primary" />
                        {editId === k.id ? (
                          <div className="flex flex-1 gap-2">
                            <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="font-mono" autoFocus />
                            <Button size="sm" onClick={() => saveEdit(k.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <p className="font-mono font-semibold">{k.code}</p>
                            {k.label && <p className="text-xs text-muted-foreground">{k.label}</p>}
                          </div>
                        )}
                        {editId !== k.id && (
                          <div className="flex items-center gap-1">
                            <label className="mr-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={k.is_active} onCheckedChange={() => toggle(k)} /> {k.is_active ? "Active" : "Off"}</label>
                            <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard.writeText(k.code); toast.success("Copied"); }}><Copy /></Button>
                            <Button size="icon" variant="ghost" aria-label="Change" onClick={() => { setEditId(k.id); setEditCode(k.code); }}><Pencil /></Button>
                            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(k)}><Trash2 className="text-destructive" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
