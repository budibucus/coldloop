import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { filterEligibleForStep } from "@/lib/emails/sequencing";
import ContactPickerForm from "./contact-picker-form";
import { BUTTON_PRIMARY } from "@/lib/ui/button-styles";

const OBJECTIVE_LABELS: Record<string, string> = {
  initial: "Initial outreach",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
};

export default async function CampaignDetailPage(
  props: PageProps<"/campaigns/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const { data: emailRows } = await supabase
    .from("emails")
    .select("status")
    .eq("campaign_id", campaign.id);

  const stats = { sent: 0, failed: 0, draft: 0 };
  for (const row of emailRows ?? []) {
    if (row.status === "sent") stats.sent += 1;
    else if (row.status === "failed") stats.failed += 1;
    else if (row.status === "draft") stats.draft += 1;
  }

  const remainingBudget = campaign.max_send_count - stats.sent - stats.draft;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["not_sent", "sent"]);

  const { data: sentEmails } = await supabase
    .from("emails")
    .select("contact_id, sequence_step, sent_at")
    .eq("user_id", user.id)
    .eq("status", "sent");

  const eligibleContacts = filterEligibleForStep(
    contacts ?? [],
    sentEmails ?? [],
    campaign.objective,
  );

  return (
    <main className="mx-auto mt-24 w-full max-w-2xl px-4 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{campaign.name}</h1>
        <Link href="/campaigns" className="text-sm text-zinc-500 underline">
          Back to campaigns
        </Link>
      </div>

      <div className="mb-6 rounded border border-zinc-300 p-4 text-sm dark:border-zinc-700">
        <p>
          Objective: {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
        </p>
        <p>
          {stats.sent}/{campaign.max_send_count} sent
          {stats.failed > 0 ? `, ${stats.failed} failed` : ""}
          {stats.draft > 0 ? `, ${stats.draft} pending review` : ""}
        </p>
        {campaign.attachment_filename && (
          <p>Attachment: {campaign.attachment_filename}</p>
        )}
      </div>

      {stats.draft > 0 && (
        <Link href="/review" className={`mb-6 ${BUTTON_PRIMARY}`}>
          Review {stats.draft} pending email{stats.draft === 1 ? "" : "s"}
        </Link>
      )}

      {remainingBudget <= 0 ? (
        <p className="text-sm text-zinc-500">
          This campaign has reached its max send count.
        </p>
      ) : eligibleContacts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No contacts are currently due for this objective.
        </p>
      ) : (
        <ContactPickerForm
          campaignId={campaign.id}
          contacts={eligibleContacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          }))}
          remainingBudget={remainingBudget}
        />
      )}
    </main>
  );
}
