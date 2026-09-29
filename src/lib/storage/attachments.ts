import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const BUCKET = "attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function uploadAttachment(
  supabase: SupabaseClient<Database>,
  userId: string,
  folder: "profile" | "contacts",
  file: File,
): Promise<{ path: string; filename: string } | { error: string }> {
  if (file.size === 0) {
    return { error: "Attachment file is empty." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "Attachment must be under 10MB." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return { error: error.message };
  }

  return { path, filename: file.name };
}

export async function downloadAttachment(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return null;
  }
  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: data.type || "application/octet-stream",
  };
}

export async function deleteAttachment(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}
