"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderEmail } from "@/lib/emails/templates";
import { filterEligibleForStep } from "@/lib/emails/sequencing";

export type PrepareCampaignState = { error: string } | null;

export async function prepareCampaignBatch(
  _prevState: PrepareCampaignState,
  formData: FormData,
): Promise<PrepareCampaignState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaignId = String(formData.get("campaign_id") ?? "");
  const selectedIds = formData.getAll("contact_id").map(String);

  if (selectedIds.length === 0) {
    return { error: "Select at least one contact." };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!campaign) {
    return { error: "Campaign not found." };
  }

  const { data: profile } = await supabase
    .from("sender_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "Complete your profile before sending." };
  }

  const { count: sentForCampaign } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "sent");

  const { count: draftForCampaign } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "draft");

  const remainingBudget =
    campaign.max_send_count - (sentForCampaign ?? 0) - (draftForCampaign ?? 0);

  if (remainingBudget <= 0) {
    return { error: "This campaign has reached its max send count." };
  }

  // Re-validate eligibility server-side rather than trusting the submitted
  // checkbox values -- the client's list could be stale or tampered with,
  // and the whole point of "keep automatic timing" is that it's enforced,
  // not just suggested.
  const { data: candidateContacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .in("id", selectedIds)
    .in("status", ["not_sent", "sent"]);

  const { data: sentEmails } = await supabase
    .from("emails")
    .select("contact_id, sequence_step, sent_at")
    .eq("user_id", user.id)
    .eq("status", "sent");

  const eligibleContacts = filterEligibleForStep(
    candidateContacts ?? [],
    sentEmails ?? [],
    campaign.objective,
  );

  if (eligibleContacts.length === 0) {
    return {
      error: "None of the selected contacts are currently eligible for this objective.",
    };
  }

  const contactsToUse = eligibleContacts.slice(0, remainingBudget);

  const draftRows = contactsToUse.map((contact) => {
    const { subject, body } = renderEmail(campaign.objective, profile, contact);
    const attachmentFilename =
      contact.attachment_filename ??
      campaign.attachment_filename ??
      profile.default_attachment_filename ??
      null;

    return {
      user_id: user.id,
      contact_id: contact.id,
      campaign_id: campaign.id,
      sequence_step: campaign.objective,
      subject,
      body,
      status: "draft" as const,
      attachment_filename: attachmentFilename,
    };
  });

  const { error } = await supabase.from("emails").insert(draftRows);
  if (error) {
    return { error: error.message };
  }

  redirect("/review");
}
