import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUTTON_PRIMARY } from "@/lib/ui/button-styles";

const OBJECTIVE_LABELS: Record<string, string> = {
  initial: "Initial outreach",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, objective, max_send_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: emailCounts } = await supabase
    .from("emails")
    .select("campaign_id, status")
    .eq("user_id", user.id)
    .not("campaign_id", "is", null);

  const statsByCampaign = new Map<string, { sent: number; failed: number; draft: number }>();
  for (const row of emailCounts ?? []) {
    if (!row.campaign_id) continue;
    const stats = statsByCampaign.get(row.campaign_id) ?? { sent: 0, failed: 0, draft: 0 };
    if (row.status === "sent") stats.sent += 1;
    else if (row.status === "failed") stats.failed += 1;
    else if (row.status === "draft") stats.draft += 1;
    statsByCampaign.set(row.campaign_id, stats);
  }

  return (
    <main className="mx-auto mt-24 w-full max-w-2xl px-4 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Link href="/dashboard" className="text-sm text-zinc-500 underline">
          Back to dashboard
        </Link>
      </div>

      <Link href="/campaigns/new" className={`mb-6 ${BUTTON_PRIMARY}`}>
        New campaign
      </Link>

      {!campaigns || campaigns.length === 0 ? (
        <p className="text-sm text-zinc-500">No campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const stats = statsByCampaign.get(campaign.id) ?? {
              sent: 0,
              failed: 0,
              draft: 0,
            };
            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block rounded border border-zinc-300 p-4 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{campaign.name}</span>
                  <span className="text-zinc-500">
                    {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
                  </span>
                </div>
                <div className="mt-1 text-zinc-500">
                  {stats.sent}/{campaign.max_send_count} sent
                  {stats.failed > 0 ? `, ${stats.failed} failed` : ""}
                  {stats.draft > 0 ? `, ${stats.draft} pending review` : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
