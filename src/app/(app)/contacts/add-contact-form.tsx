"use client";

import { useActionState } from "react";
import { addContact, type ContactFormState } from "./actions";
import FileInputButton from "@/components/file-input-button";
import { BUTTON_PRIMARY } from "@/lib/ui/button-styles";

const inputClasses =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function AddContactForm() {
  const [state, formAction, pending] = useActionState<
    ContactFormState,
    FormData
  >(addContact, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name="name"
          type="text"
          placeholder="Name *"
          required
          className={inputClasses}
        />
        <input
          name="email"
          type="email"
          placeholder="Email *"
          required
          className={inputClasses}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="company"
          type="text"
          placeholder="Company"
          className={inputClasses}
        />
        <input
          name="personalization_notes"
          type="text"
          placeholder="Personalization notes"
          className={inputClasses}
        />
      </div>

      <div>
        <p className="mb-1 text-xs text-zinc-500">
          Attachment for this contact (optional, overrides your default)
        </p>
        <FileInputButton name="attachment" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        {pending ? "Adding..." : "Add contact"}
      </button>
    </form>
  );
}
