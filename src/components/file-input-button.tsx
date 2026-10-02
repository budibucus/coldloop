"use client";

import { useId, useState } from "react";
import { BUTTON_SECONDARY_SMALL } from "@/lib/ui/button-styles";

export default function FileInputButton({
  name,
  defaultFilename,
}: {
  name: string;
  defaultFilename?: string | null;
}) {
  const id = useId();
  const [filename, setFilename] = useState<string | null>(
    defaultFilename ?? null,
  );

  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className={`${BUTTON_SECONDARY_SMALL} cursor-pointer`}>
        Choose file
      </label>
      <input
        id={id}
        name={name}
        type="file"
        className="hidden"
        onChange={(e) => setFilename(e.target.files?.[0]?.name ?? null)}
      />
      <span className="truncate text-sm text-zinc-500">
        {filename ?? "No file chosen"}
      </span>
    </div>
  );
}
