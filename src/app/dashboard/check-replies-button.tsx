"use client";

import { useActionState } from "react";
import { checkForReplies, type CheckRepliesState } from "./check-replies-actions";
import { BUTTON_SECONDARY } from "@/lib/ui/button-styles";

export default function CheckRepliesButton() {
  const [state, formAction, pending] = useActionState<
    CheckRepliesState,
    FormData
  >(checkForReplies, null);

  return (
    <form action={formAction} className="inline-block space-y-2">
      <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>
        {pending ? "Checking..." : "Check for replies"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
