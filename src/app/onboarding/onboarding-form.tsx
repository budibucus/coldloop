"use client";

import { useActionState } from "react";
import { saveSenderProfile, type OnboardingFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type SenderProfile = Database["public"]["Tables"]["sender_profiles"]["Row"];

const TONES = ["Professional", "Friendly", "Direct", "Casual"];

const inputClasses =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function OnboardingForm({
  profile,
}: {
  profile: SenderProfile | null;
}) {
  const [state, formAction, pending] = useActionState<
    OnboardingFormState,
    FormData
  >(saveSenderProfile, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="company" className="mb-1 block text-sm font-medium">
          Company *
        </label>
        <input
          id="company"
          name="company"
          type="text"
          required
          defaultValue={profile?.company ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="sender_name" className="mb-1 block text-sm font-medium">
          Your name *
        </label>
        <input
          id="sender_name"
          name="sender_name"
          type="text"
          required
          defaultValue={profile?.sender_name ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="sender_title" className="mb-1 block text-sm font-medium">
          Your title
        </label>
        <input
          id="sender_title"
          name="sender_title"
          type="text"
          defaultValue={profile?.sender_title ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label
          htmlFor="product_description"
          className="mb-1 block text-sm font-medium"
        >
          What you&apos;re offering
        </label>
        <textarea
          id="product_description"
          name="product_description"
          rows={3}
          defaultValue={profile?.product_description ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label
          htmlFor="target_segments"
          className="mb-1 block text-sm font-medium"
        >
          Target segments
        </label>
        <textarea
          id="target_segments"
          name="target_segments"
          rows={2}
          placeholder="e.g. Series A SaaS founders, US-based"
          defaultValue={profile?.target_segments ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="tone" className="mb-1 block text-sm font-medium">
          Messaging tone
        </label>
        <select
          id="tone"
          name="tone"
          defaultValue={profile?.tone ?? ""}
          className={inputClasses}
        >
          <option value="">Select a tone</option>
          {TONES.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? "Saving..." : "Save and continue"}
      </button>
    </form>
  );
}
