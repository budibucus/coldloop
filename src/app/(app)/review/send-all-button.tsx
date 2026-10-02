"use client";

import { useActionState } from "react";
import { confirmAndSendAll, type ConfirmSendState } from "./actions";
import { BUTTON_PRIMARY } from "@/lib/ui/button-styles";

export default function SendAllButton() {
  const [state, formAction, pending] = useActionState<
    ConfirmSendState,
    FormData
  >(confirmAndSendAll, null);

  return (
    <form action={formAction} className="space-y-2">
      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        {pending ? "Sending..." : "Confirm and send"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
