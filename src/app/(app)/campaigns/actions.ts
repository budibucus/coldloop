"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachment } from "@/lib/storage/attachments";
import type { Database } from "@/lib/supabase/database.types";

export type CreateCampaignState = { error: string } | null;

type SequenceStep = Database["public"]["Enums"]["email_sequence_step"];
const VALID_OBJECTIVES: SequenceStep[] = ["initial", "followup1", "followup2"];

export async function createCampaign(
  _prevState: CreateCampaignState,
  formData: FormData,
): Promise<CreateCampaignState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const objective = String(formData.get("objective") ?? "") as SequenceStep;
  const maxSendCountRaw = String(formData.get("max_send_count") ?? "").trim();
  const maxSendCount = Number(maxSendCountRaw);

  if (!name) {
    return { error: "Give the campaign a name." };
  }
  if (!VALID_OBJECTIVES.includes(objective)) {
    return { error: "Pick an objective." };
  }
  if (!Number.isInteger(maxSendCount) || maxSendCount < 1) {
    return { error: "Max emails must be a positive whole number." };
  }

  let attachmentPath: string | null = null;
  let attachmentFilename: string | null = null;

  const attachmentFile = formData.get("attachment");
  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    const result = await uploadAttachment(supabase, user.id, "campaigns", attachmentFile);
    if ("error" in result) {
      return { error: result.error };
    }
    attachmentPath = result.path;
    attachmentFilename = result.filename;
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name,
      objective,
      max_send_count: maxSendCount,
      attachment_path: attachmentPath,
      attachment_filename: attachmentFilename,
    })
    .select("id")
    .single();

  if (error || !campaign) {
    return { error: error?.message ?? "Could not create campaign." };
  }

  redirect(`/campaigns/${campaign.id}`);
}
