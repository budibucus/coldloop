import type { ReactNode } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function AppShell({
  userEmail,
  pendingCount,
  children,
}: {
  userEmail: string | null | undefined;
  pendingCount: number;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
