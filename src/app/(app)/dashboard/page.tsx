import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckRepliesButton from "./check-replies-button";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/ui/button-styles";

const GMAIL_STATUS_MESSAGES: Record<string, string> = {
  connected: "Gmail connected.",
  denied: "Gmail connection was cancelled.",
  not_allowed: "Sending is in limited beta — request access.",
  error: "Something went wrong connecting Gmail. Please try again.",
};

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const gmailStatusParam = searchParams.gmail;
  const gmailStatus = Array.isArray(gmailStatusParam)
    ? gmailStatusParam[0]
    : gmailStatusParam;

  const batchParam = searchParams.batch;
  const batchStatus = Array.isArray(batchParam) ? batchParam[0] : batchParam;
  const sentParam = searchParams.sent;
  const failedParam = searchParams.failed;
  const batchSent = Number(Array.isArray(sentParam) ? sentParam[0] : sentParam) || 0;
  const batchFailed =
    Number(Array.isArray(failedParam) ? failedParam[0] : failedParam) || 0;

  const repliesParam = searchParams.replies;
  const repliesStatus = Array.isArray(repliesParam) ? repliesParam[0] : repliesParam;
  const checkedParam = searchParams.checked;
  const repliedParam = searchParams.replied;
  const repliesChecked =
    Number(Array.isArray(checkedParam) ? checkedParam[0] : checkedParam) || 0;
  const repliesReplied =
    Number(Array.isArray(repliedParam) ? repliedParam[0] : repliedParam) || 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("sender_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

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

  const { count: pendingDrafts } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "draft");

  const { count: contactCount } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: campaignCount } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: sentCount } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent");

  const steps = [
    { label: "Set up your profile", done: true },
    { label: "Add contacts", done: (contactCount ?? 0) > 0 },
    { label: "Connect Gmail", done: !!gmailConnection },
    { label: "Create a campaign", done: (campaignCount ?? 0) > 0 },
    { label: "Send your first email", done: (sentCount ?? 0) > 0 },
  ];
  const completedSteps = steps.filter((s) => s.done).length;

  return (
    <div>
      {gmailStatus && GMAIL_STATUS_MESSAGES[gmailStatus] && (
        <p className="mb-4 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          {GMAIL_STATUS_MESSAGES[gmailStatus]}
        </p>
      )}

      {batchStatus === "sent" && (
        <p className="mb-4 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Sent {batchSent}
          {batchFailed > 0 ? `, ${batchFailed} failed` : ""}.
        </p>
      )}

      {repliesStatus === "checked" && (
        <p className="mb-4 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Checked {repliesChecked} contact{repliesChecked === 1 ? "" : "s"}
          {repliesReplied > 0
            ? `, ${repliesReplied} replied — pending follow-ups canceled.`
            : ", no new replies."}
        </p>
      )}

      {completedSteps < steps.length && (
        <div className="mb-6 rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Let&apos;s build your outreach</p>
            <p className="text-sm text-zinc-500">
              {completedSteps}/{steps.length} steps completed
            </p>
          </div>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div
              className="h-full bg-indigo-600"
              style={{ width: `${(completedSteps / steps.length) * 100}%` }}
            />
          </div>
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    step.done
                      ? "bg-indigo-600 text-white"
                      : "border border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {step.done && "✓"}
                </span>
                <span className={step.done ? "text-zinc-400 line-through" : ""}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        {gmailConnection ? (
          <>
            <p className="mb-3 text-sm text-zinc-500">
              Gmail connected: {gmailConnection.gmail_address}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {(pendingDrafts ?? 0) > 0 && (
                <Link href="/review" className={BUTTON_PRIMARY}>
                  Review {pendingDrafts} pending email{pendingDrafts === 1 ? "" : "s"}
                </Link>
              )}
              <Link href="/campaigns" className={BUTTON_SECONDARY}>
                Campaigns
              </Link>
              <CheckRepliesButton />
            </div>
          </>
        ) : allowedSender ? (
          <a href="/api/gmail/connect" className={BUTTON_PRIMARY}>
            Connect Gmail
          </a>
        ) : (
          <p className="text-sm text-zinc-500">
            Sending is in limited beta — request access.
          </p>
        )}
      </div>
    </div>
  );
}
