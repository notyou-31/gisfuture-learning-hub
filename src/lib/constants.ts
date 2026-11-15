import type { Database } from "@/integrations/supabase/types";

export type ResourceKind = Database["public"]["Enums"]["resource_type"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const RESOURCE_KINDS: { value: ResourceKind; label: string; short: string }[] = [
  { value: "video", label: "Video lectures", short: "Video" },
  { value: "notes", label: "Downloadable notes", short: "Notes" },
  { value: "pdf", label: "PDFs", short: "PDF" },
  { value: "ncert", label: "NCERT solutions", short: "NCERT" },
  { value: "important", label: "Important questions", short: "Important" },
  { value: "revision", label: "Revision material", short: "Revision" },
  { value: "practice", label: "Practice exercises", short: "Practice" },
  { value: "mock", label: "Full mock papers", short: "Mock" },
];

export const kindLabel = (k: ResourceKind) => RESOURCE_KINDS.find((r) => r.value === k)?.label ?? k;

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super admin",
  teacher: "Teacher",
  student: "Student",
};

export function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
      else id = u.searchParams.get("v");
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
