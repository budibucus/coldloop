"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";

export default function UserMenu({
  userEmail,
}: {
  userEmail: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = userEmail?.[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-black"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded border border-zinc-200 bg-white p-2 text-sm shadow-lg dark:border-zinc-800 dark:bg-black">
          <p className="truncate px-2 py-1 text-zinc-500">{userEmail}</p>
          <Link
            href="/onboarding"
            className="block rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            onClick={() => setOpen(false)}
          >
            Edit profile
          </Link>
          <div className="mt-1 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
