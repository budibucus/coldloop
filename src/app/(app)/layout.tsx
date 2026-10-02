import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell/shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count: pendingDrafts } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "draft");

  const { data: gmailConnection } = await supabase
    .from("gmail_connections")
    .select("gmail_address")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: allowedSender } = user.email
    ? await supabase
        .from("allowed_senders")
        .select("email")
        .eq("email", user.email)
        .maybeSingle()
    : { data: null };

  return (
    <AppShell
      userEmail={user.email}
      pendingCount={pendingDrafts ?? 0}
      gmailStatus={
        gmailConnection ? "connected" : allowedSender ? "not_connected" : "not_allowed"
      }
    >
      {children}
    </AppShell>
  );
}
