"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export default function Sidebar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex dark:border-zinc-800 dark:bg-black">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-5 dark:border-zinc-800">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-xs font-bold text-white">
          C
        </span>
        <span className="text-sm font-semibold">Coldloop</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <span>{item.label}</span>
              {item.href === "/review" && pendingCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    active
                      ? "bg-white/20"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
