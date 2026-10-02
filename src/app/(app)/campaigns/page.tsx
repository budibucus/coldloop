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
    <div>
      <Link href="/campaigns/new" className={`mb-6 ${BUTTON_PRIMARY}`}>
        New campaign
      </Link>

      {!campaigns || campaigns.length === 0 ? (
        <p className="text-sm text-zinc-500">No campaigns yet.</p>
      ) : (
        <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Objective</th>
                <th className="px-4 py-2 font-medium">Sent</th>
                <th className="px-4 py-2 font-medium">Failed</th>
                <th className="px-4 py-2 font-medium">Pending review</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const stats = statsByCampaign.get(campaign.id) ?? {
                  sent: 0,
                  failed: 0,
                  draft: 0,
                };
                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
                    </td>
                    <td className="px-4 py-2">
                      {stats.sent}/{campaign.max_send_count}
                    </td>
                    <td className="px-4 py-2">{stats.failed || "—"}</td>
                    <td className="px-4 py-2">{stats.draft || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
