"use client";

import { useActionState } from "react";
import {
  updateDraftEmail,
  discardDraftEmail,
  type DraftActionState,
} from "./actions";
import { BUTTON_SECONDARY_SMALL, BUTTON_DANGER_SMALL } from "@/lib/ui/button-styles";

const inputClasses =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function DraftEmailCard({
  draft,
  contact,
}: {
  draft: {
    id: string;
    subject: string;
    body: string;
    sequence_step: string;
    attachment_filename: string | null;
  };
  contact: { name: string; email: string } | undefined;
}) {
  const [updateState, updateAction, updatePending] = useActionState<
    DraftActionState,
    FormData
  >(updateDraftEmail, null);
  const [discardState, discardAction, discardPending] = useActionState<
    DraftActionState,
    FormData
  >(discardDraftEmail, null);

  return (
    <div className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {contact?.name ?? "Unknown contact"} &lt;{contact?.email ?? "?"}&gt;
          {" — "}
          {draft.sequence_step}
        </span>
        {draft.attachment_filename && <span>📎 {draft.attachment_filename}</span>}
      </div>

      <form action={updateAction} className="space-y-2">
        <input type="hidden" name="email_id" value={draft.id} />
        <input
          name="subject"
          defaultValue={draft.subject}
          className={inputClasses}
        />
        <textarea
          name="body"
          rows={6}
          defaultValue={draft.body}
          className={inputClasses}
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={updatePending}
            className={BUTTON_SECONDARY_SMALL}
          >
            {updatePending ? "Saving..." : "Save edits"}
          </button>
          <button
            formAction={discardAction}
            disabled={discardPending}
            className={BUTTON_DANGER_SMALL}
          >
            {discardPending ? "Removing..." : "Discard"}
          </button>
        </div>
        {updateState?.error && (
          <p className="text-xs text-red-600">{updateState.error}</p>
        )}
        {discardState?.error && (
          <p className="text-xs text-red-600">{discardState.error}</p>
        )}
      </form>
    </div>
  );
}
