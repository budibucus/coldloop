"use client";

import { useActionState } from "react";
import { prepareTodaysBatch, type PrepareBatchState } from "./prepare-batch-actions";

export default function PrepareBatchButton() {
  const [state, formAction, pending] = useActionState<
    PrepareBatchState,
    FormData
  >(prepareTodaysBatch, null);

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? "Preparing..." : "Prepare today's batch"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
