"use client";

import { usePathname } from "next/navigation";

export type GmailStatus = "connected" | "not_connected" | "not_allowed";

export default function GmailStatusBanner({ status }: { status: GmailStatus }) {
  const pathname = usePathname();

  // The dashboard already shows this with more detail (address, action
  // buttons) -- avoid a redundant second message there.
  if (status === "connected" || pathname === "/dashboard") {
    return null;
  }

  return (
    <div className="border-b border-zinc-200 bg-amber-50 px-6 py-2 text-sm text-amber-900 dark:border-zinc-800 dark:bg-amber-950 dark:text-amber-200">
      {status === "not_connected" ? (
        <>
          Gmail isn&apos;t connected yet.{" "}
          <a href="/api/gmail/connect" className="font-medium underline">
            Connect Gmail
          </a>{" "}
          before sending.
        </>
      ) : (
        "Sending is in limited beta — request access."
      )}
    </div>
  );
}
