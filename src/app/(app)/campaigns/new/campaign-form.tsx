"use client";

import { useActionState } from "react";
import { createCampaign, type CreateCampaignState } from "../actions";
import FileInputButton from "@/components/file-input-button";
import { BUTTON_PRIMARY } from "@/lib/ui/button-styles";

const inputClasses =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const OBJECTIVES = [
  { value: "initial", label: "Initial outreach" },
  { value: "followup1", label: "Follow-up 1" },
  { value: "followup2", label: "Follow-up 2" },
];

export default function CampaignForm() {
  const [state, formAction, pending] = useActionState<
    CreateCampaignState,
    FormData
  >(createCampaign, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Campaign name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Q4 outreach wave 1"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="objective" className="mb-1 block text-sm font-medium">
          Objective *
        </label>
        <select id="objective" name="objective" required className={inputClasses}>
          <option value="">Select an objective</option>
          {OBJECTIVES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Only contacts actually due for this step will be selectable when you
          prepare the batch.
        </p>
      </div>

      <div>
        <label htmlFor="max_send_count" className="mb-1 block text-sm font-medium">
          Max emails for this campaign *
        </label>
        <input
          id="max_send_count"
          name="max_send_count"
          type="number"
          min={1}
          defaultValue={30}
          required
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-zinc-500">
          A ceiling across this campaign&apos;s whole lifetime, even if you
          prepare and send from it more than once.
        </p>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Campaign attachment</p>
        <FileInputButton name="attachment" />
        <p className="mt-1 text-xs text-zinc-500">
          Used for emails from this campaign unless a contact has its own
          attachment. Max 10MB.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        {pending ? "Creating..." : "Create campaign"}
      </button>
    </form>
  );
}
