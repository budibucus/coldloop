import type { ReactNode } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import GmailStatusBanner, { type GmailStatus } from "./gmail-status-banner";

export default function AppShell({
  userEmail,
  pendingCount,
  gmailStatus,
  children,
}: {
  userEmail: string | null | undefined;
  pendingCount: number;
  gmailStatus: GmailStatus;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <GmailStatusBanner status={gmailStatus} />
        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
