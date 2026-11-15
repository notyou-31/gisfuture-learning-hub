import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("subjects").select("*").order("sort");
    if (error) throw error;
    return data;
  },
});

export const chaptersQuery = queryOptions({
  queryKey: ["chapters"],
  queryFn: async () => {
    const { data, error } = await supabase.from("chapters").select("*").order("sort");
    if (error) throw error;
    return data;
  },
});

export function useCatalog() {
  const subjects = useQuery(subjectsQuery);
  const chapters = useQuery(chaptersQuery);
  const subjectName: Record<string, string> = {};
  const chapterName: Record<string, string> = {};
  subjects.data?.forEach((s) => (subjectName[s.id] = s.name));
  chapters.data?.forEach((c) => (chapterName[c.id] = c.name));
  return {
    subjects: subjects.data ?? [],
    chapters: chapters.data ?? [],
    subjectName,
    chapterName,
    isLoading: subjects.isLoading || chapters.isLoading,
  };
}

export const myAttemptsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-attempts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("*, tests(title, subject_id, chapter_id, duration_minutes)")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const publishedTestsQuery = queryOptions({
  queryKey: ["tests", "published"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
