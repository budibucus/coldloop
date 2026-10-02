"use client";

import { usePathname } from "next/navigation";
import UserMenu from "./user-menu";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contacts": "Contacts",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New Campaign",
  "/review": "Review",
  "/onboarding": "Profile",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/campaigns/")) return "Campaign";
  return "Coldloop";
}

export default function Topbar({
  userEmail,
}: {
  userEmail: string | null | undefined;
}) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-black">
      <h1 className="text-lg font-semibold">{titleFor(pathname)}</h1>
      <UserMenu userEmail={userEmail} />
    </header>
  );
}
