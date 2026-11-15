import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/constants";

export type Person = { id: string; full_name: string; phone: string; role: AppRole | null; last_seen_at: string | null; last_login_at: string | null; login_count: number; created_at: string };

export const peopleQuery = queryOptions({
  queryKey: ["people"],
  queryFn: async (): Promise<Person[]> => {
    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw error;
    const r = new Map((roles ?? []).map((x) => [x.user_id, x.role as AppRole]));
    return (profiles ?? []).map((p) => ({ ...p, role: r.get(p.id) ?? null }));
  },
});

export function usePeople() {
  const q = useQuery(peopleQuery);
  const byId: Record<string, Person> = {};
  q.data?.forEach((p) => (byId[p.id] = p));
  return { ...q, byId };
}
