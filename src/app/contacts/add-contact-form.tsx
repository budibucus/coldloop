"use client";

import { useActionState } from "react";
import { addContact, type ContactFormState } from "./actions";

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
        <label htmlFor="contact-attachment" className="mb-1 block text-xs text-zinc-500">
          Attachment for this contact (optional, overrides your default)
        </label>
        <input
          id="contact-attachment"
          name="attachment"
          type="file"
          className="w-full text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? "Adding..." : "Add contact"}
      </button>
    </form>
  );
}
