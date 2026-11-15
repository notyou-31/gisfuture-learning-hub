import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "school-files";

export async function uploadSchoolFile(file: File, folder: string) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, name: file.name };
}

export async function openSchoolFile(path: string) {
  const win = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) {
    win?.close();
    throw new Error("Could not open this file.");
  }
  if (win) win.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

export async function removeSchoolFile(path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
