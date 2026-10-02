import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DraftEmailCard from "./draft-email-card";
import SendAllButton from "./send-all-button";

export default async function ReviewPage() {
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
