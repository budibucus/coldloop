import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DraftEmailCard from "./draft-email-card";
import SendAllButton from "./send-all-button";

export default async function ReviewPage(props: PageProps<"/review">) {
  const searchParams = await props.searchParams;
  const aiFailedParam = searchParams.ai_failed;
  const aiFailed =
    Number(Array.isArray(aiFailedParam) ? aiFailedParam[0] : aiFailedParam) || 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: drafts } = await supabase
    .from("emails")
    .select("id, contact_id, subject, body, sequence_step, attachment_filename")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  const contactIds = [...new Set((drafts ?? []).map((d) => d.contact_id))];
  const { data: contactRows } =
    contactIds.length > 0
      ? await supabase.from("contacts").select("id, name, email").in("id", contactIds)
      : { data: [] };
  const contactById = new Map((contactRows ?? []).map((c) => [c.id, c]));

  return (
    <div>
      {aiFailed > 0 && (
        <p className="mb-4 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
          AI generation failed for {aiFailed} contact{aiFailed === 1 ? "" : "s"};
          they were skipped and can be prepared again later.
        </p>
      )}

      {!drafts || drafts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing to review. Prepare a batch from a campaign first.
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-zinc-500">
            {drafts.length} email{drafts.length === 1 ? "" : "s"} ready. Edit
            anything below, then confirm to send.
          </p>
          <div className="space-y-6">
            {drafts.map((draft) => (
              <DraftEmailCard
                key={draft.id}
                draft={draft}
                contact={contactById.get(draft.contact_id)}
              />
            ))}
          </div>
          <div className="mt-8">
            <SendAllButton />
          </div>
        </>
      )}
    </div>
  );
}
