"use client";

import { useActionState } from "react";
import { importContactsCsv, type CsvImportState } from "./actions";

export default function ImportCsvForm() {
  const [state, formAction, pending] = useActionState<
    CsvImportState,
    FormData
  >(importContactsCsv, null);

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="csv"
        rows={6}
        placeholder={"name,email,company,notes\nJane Doe,jane@example.com,Acme,Met at conference"}
        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <p className="text-xs text-zinc-500">
        First row must be a header with at least <code>name</code> and{" "}
        <code>email</code> columns. <code>company</code> and{" "}
        <code>notes</code> are optional.
      </p>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "imported" in state && (
        <p className="text-sm text-green-600">
          Imported {state.imported} contact{state.imported === 1 ? "" : "s"}
          {state.skipped > 0
            ? ` (skipped ${state.skipped} row${state.skipped === 1 ? "" : "s"} missing name or email)`
            : ""}
          .
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Importing..." : "Import CSV"}
      </button>
    </form>
  );
}
