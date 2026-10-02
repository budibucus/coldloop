"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGmailClientForUser } from "@/lib/gmail/client";
import { hasRepliedSince, isInsufficientScopeError } from "@/lib/gmail/replies";

export type CheckRepliesState = { error: string } | null;

export async function checkForReplies(
  _prevState: CheckRepliesState,
  _formData: FormData,
): Promise<CheckRepliesState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const gmailClient = await getGmailClientForUser(supabase, user.id);
  if (!gmailClient) {
    return { error: "Connect Gmail before checking replies." };
  }

  const { data: activeContacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("user_id", user.id)
    .eq("status", "sent");

  if (contactsError) {
    return { error: contactsError.message };
  }
  if (!activeContacts || activeContacts.length === 0) {
    redirect("/dashboard?replies=checked&checked=0&replied=0");
  }

  const contactIds = activeContacts.map((c) => c.id);
  const { data: sentEmails, error: emailsError } = await supabase
    .from("emails")
    .select("contact_id, sent_at")
    .eq("user_id", user.id)
    .eq("status", "sent")
    .in("contact_id", contactIds);

  if (emailsError) {
    return { error: emailsError.message };
  }

  const lastSentByContact = new Map<string, Date>();
  for (const email of sentEmails ?? []) {
    if (!email.sent_at) continue;
    const sentAt = new Date(email.sent_at);
    const existing = lastSentByContact.get(email.contact_id);
    if (!existing || sentAt > existing) {
      lastSentByContact.set(email.contact_id, sentAt);
    }
  }

  let checked = 0;
  let replied = 0;

  for (const contact of activeContacts) {
    const lastSent = lastSentByContact.get(contact.id);
    if (!lastSent) continue;
    checked += 1;

    let replyFound: boolean;
    try {
      replyFound = await hasRepliedSince(
        gmailClient.oauth2Client,
        contact.email,
        lastSent,
      );
    } catch (err) {
      if (isInsufficientScopeError(err)) {
        return {
          error:
            "Your Gmail connection needs to be refreshed to check replies. Reconnect Gmail on the dashboard.",
        };
      }
      continue;
    }

    if (replyFound) {
      replied += 1;
      await supabase.from("contacts").update({ status: "replied" }).eq("id", contact.id);
      await supabase
        .from("emails")
        .update({ status: "canceled" })
        .eq("contact_id", contact.id)
        .eq("status", "draft");
    }
  }

  redirect(`/dashboard?replies=checked&checked=${checked}&replied=${replied}`);
}
