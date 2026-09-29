"use client";

import { useActionState } from "react";
import { sendTodaysBatch, type SendBatchState } from "./send-batch-actions";

export default function SendBatchButton() {
  const [state, formAction, pending] = useActionState<
    SendBatchState,
    FormData
  >(sendTodaysBatch, null);

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? "Sending..." : "Send today's batch"}
      </button>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "sent" in state && (
        <p className="text-sm text-zinc-500">
          Sent {state.sent}
          {state.failed > 0 ? `, ${state.failed} failed` : ""}.
          {state.capReached ? " Daily send cap reached." : ""}
        </p>
      )}
    </form>
  );
}
