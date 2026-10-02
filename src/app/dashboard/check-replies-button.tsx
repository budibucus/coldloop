"use client";

import { useActionState } from "react";
import { checkForReplies, type CheckRepliesState } from "./check-replies-actions";

export default function CheckRepliesButton() {
  const [state, formAction, pending] = useActionState<
    CheckRepliesState,
    FormData
  >(checkForReplies, null);

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Checking..." : "Check for replies"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
