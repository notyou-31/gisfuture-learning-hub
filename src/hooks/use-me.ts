import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/constants";

export type Me = {
  id: string;
  fullName: string;
  phone: string;
  role: AppRole | null;
};

export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (!profile) return null;
    return {
      id: user.id,
      fullName: profile.full_name,
      phone: profile.phone,
      role: (roles?.[0]?.role as AppRole) ?? null,
    };
  },
  staleTime: 60_000,
});

export function useMe() {
  return useQuery(meQueryOptions);
}

export function isStaffRole(role: AppRole | null | undefined) {
  return role === "teacher" || role === "super_admin";
}
