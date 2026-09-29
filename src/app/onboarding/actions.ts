"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachment, deleteAttachment } from "@/lib/storage/attachments";
import type { Database } from "@/lib/supabase/database.types";

export type OnboardingFormState = { error: string } | null;

export async function saveSenderProfile(
  _prevState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = String(formData.get("company") ?? "").trim();
  const senderName = String(formData.get("sender_name") ?? "").trim();
  const senderTitle = String(formData.get("sender_title") ?? "").trim();
  const productDescription = String(formData.get("product_description") ?? "").trim();
  const targetSegments = String(formData.get("target_segments") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const removeAttachment = formData.get("remove_attachment") === "on";
  const attachmentFile = formData.get("attachment");

  if (!company || !senderName) {
    return { error: "Company and your name are required." };
  }

  const { data: existing } = await supabase
    .from("sender_profiles")
    .select("default_attachment_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileUpdate: Database["public"]["Tables"]["sender_profiles"]["Insert"] = {
    user_id: user.id,
    company,
    sender_name: senderName,
    sender_title: senderTitle || null,
    product_description: productDescription || null,
    target_segments: targetSegments || null,
    tone: tone || null,
  };

  if (removeAttachment && existing?.default_attachment_path) {
    await deleteAttachment(supabase, existing.default_attachment_path);
    profileUpdate.default_attachment_path = null;
    profileUpdate.default_attachment_filename = null;
  }

  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    const result = await uploadAttachment(supabase, user.id, "profile", attachmentFile);
    if ("error" in result) {
      return { error: result.error };
    }
    if (existing?.default_attachment_path) {
      await deleteAttachment(supabase, existing.default_attachment_path);
    }
    profileUpdate.default_attachment_path = result.path;
    profileUpdate.default_attachment_filename = result.filename;
  }

  const { error } = await supabase
    .from("sender_profiles")
    .upsert(profileUpdate);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
