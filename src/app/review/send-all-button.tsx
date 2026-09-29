"use client";

import { useActionState } from "react";
import { confirmAndSendAll, type ConfirmSendState } from "./actions";

export default function SendAllButton() {
  const [state, formAction, pending] = useActionState<
    ConfirmSendState,
    FormData
  >(confirmAndSendAll, null);

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? "Sending..." : "Confirm and send"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
