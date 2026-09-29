"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGmailClientForUser, sendGmailMessage } from "@/lib/gmail/client";
import { renderEmail } from "@/lib/emails/templates";
import type { Database } from "@/lib/supabase/database.types";

const DAILY_SEND_CAP = 30;
const FOLLOWUP_INTERVAL_DAYS = 3;

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type SequenceStep = Database["public"]["Enums"]["email_sequence_step"];
type SentEmail = { contact_id: string; sequence_step: SequenceStep; sent_at: string | null };

export type SendBatchState =
  | { error: string }
  | { sent: number; failed: number; capReached: boolean }
  | null;

function nextStepFor(sentEmailsForContact: SentEmail[]): {
  step: SequenceStep;
  dueAt: Date;
} | null {
  const bySentAt = [...sentEmailsForContact].sort(
    (a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime(),
  );
  const last = bySentAt[bySentAt.length - 1];

  if (!last) {
    return { step: "initial", dueAt: new Date(0) };
  }

  const dueAt = new Date(
    new Date(last.sent_at ?? 0).getTime() +
      FOLLOWUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
  );

  if (last.sequence_step === "initial") {
    return { step: "followup1", dueAt };
  }
  if (last.sequence_step === "followup1") {
    return { step: "followup2", dueAt };
  }
  return null;
}

export async function sendTodaysBatch(
  _prevState: SendBatchState,
  _formData: FormData,
): Promise<SendBatchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("sender_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "Complete your profile before sending." };
  }

  const gmailClient = await getGmailClientForUser(supabase, user.id);
  if (!gmailClient) {
    return { error: "Connect Gmail before sending." };
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count: sentToday } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent")
    .gte("sent_at", startOfToday.toISOString());

  let remainingCap = DAILY_SEND_CAP - (sentToday ?? 0);
  if (remainingCap <= 0) {
    return { sent: 0, failed: 0, capReached: true };
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["not_sent", "sent"])
    .order("created_at", { ascending: true });

  if (contactsError) {
    return { error: contactsError.message };
  }

  const { data: sentEmails, error: emailsError } = await supabase
    .from("emails")
    .select("contact_id, sequence_step, sent_at")
    .eq("user_id", user.id)
    .eq("status", "sent");

  if (emailsError) {
    return { error: emailsError.message };
  }

  const emailsByContact = new Map<string, SentEmail[]>();
  for (const email of sentEmails ?? []) {
    const list = emailsByContact.get(email.contact_id) ?? [];
    list.push(email);
    emailsByContact.set(email.contact_id, list);
  }

  const now = new Date();
  const due: { contact: Contact; step: SequenceStep }[] = [];

  for (const contact of contacts ?? []) {
    const next = nextStepFor(emailsByContact.get(contact.id) ?? []);
    if (next && next.dueAt <= now) {
      due.push({ contact, step: next.step });
    }
  }

  let sent = 0;
  let failed = 0;

  for (const { contact, step } of due) {
    if (remainingCap <= 0) break;

    const { subject, body } = renderEmail(step, profile, contact);

    try {
      await sendGmailMessage(gmailClient.oauth2Client, {
        from: gmailClient.gmailAddress,
        to: contact.email,
        subject,
        body,
      });

      await supabase.from("emails").insert({
        user_id: user.id,
        contact_id: contact.id,
        sequence_step: step,
        subject,
        body,
        sent_at: new Date().toISOString(),
        status: "sent",
      });

      if (step === "initial") {
        await supabase
          .from("contacts")
          .update({ status: "sent" })
          .eq("id", contact.id);
      }

      sent += 1;
      remainingCap -= 1;
    } catch {
      await supabase.from("emails").insert({
        user_id: user.id,
        contact_id: contact.id,
        sequence_step: step,
        subject,
        body,
        status: "failed",
      });
      failed += 1;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/contacts");

  return { sent, failed, capReached: remainingCap <= 0 };
}
