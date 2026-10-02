import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
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

  return (
    <main className="mx-auto mt-24 w-full max-w-md px-4">
      <h1 className="mb-4 text-2xl font-semibold">Coldloop</h1>
      <p className="mb-6 text-sm text-zinc-500">Signed in as {user.email}</p>

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

      <div className="mb-6">
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

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/contacts" className={BUTTON_SECONDARY}>
          Contacts
        </Link>
        <Link href="/onboarding" className={BUTTON_SECONDARY}>
          Edit profile
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
