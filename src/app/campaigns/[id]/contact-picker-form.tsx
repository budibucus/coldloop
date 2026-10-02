"use client";

import { useActionState } from "react";
import { prepareCampaignBatch, type PrepareCampaignState } from "./actions";
import { BUTTON_PRIMARY } from "@/lib/ui/button-styles";

export default function ContactPickerForm({
  campaignId,
  contacts,
  remainingBudget,
}: {
  campaignId: string;
  contacts: { id: string; name: string; email: string }[];
  remainingBudget: number;
}) {
  const [state, formAction, pending] = useActionState<
    PrepareCampaignState,
    FormData
  >(prepareCampaignBatch, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <p className="text-sm text-zinc-500">
        {contacts.length} contact{contacts.length === 1 ? "" : "s"} eligible.
        You can select up to {remainingBudget} for this campaign.
      </p>
      <div className="max-h-80 space-y-1 overflow-y-auto rounded border border-zinc-300 p-3 dark:border-zinc-700">
        {contacts.map((contact) => (
          <label key={contact.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="contact_id"
              value={contact.id}
              defaultChecked
            />
            <span>
              {contact.name} &lt;{contact.email}&gt;
            </span>
          </label>
        ))}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        {pending ? "Preparing..." : "Prepare batch"}
      </button>
    </form>
  );
}
