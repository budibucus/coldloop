"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (!company || !senderName) {
    return { error: "Company and your name are required." };
  }

  const { error } = await supabase.from("sender_profiles").upsert({
    user_id: user.id,
    company,
    sender_name: senderName,
    sender_title: senderTitle || null,
    product_description: productDescription || null,
    target_segments: targetSegments || null,
    tone: tone || null,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
