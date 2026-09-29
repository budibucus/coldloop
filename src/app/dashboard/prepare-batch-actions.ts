"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderEmail } from "@/lib/emails/templates";
import type { Database } from "@/lib/supabase/database.types";

const DAILY_SEND_CAP = 30;
const FOLLOWUP_INTERVAL_DAYS = 3;

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type SequenceStep = Database["public"]["Enums"]["email_sequence_step"];
type SentEmail = { contact_id: string; sequence_step: SequenceStep; sent_at: string | null };

export type PrepareBatchState = { error: string } | null;

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

export async function prepareTodaysBatch(
  _prevState: PrepareBatchState,
  _formData: FormData,
): Promise<PrepareBatchState> {
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

  const { data: gmailConnection } = await supabase
    .from("gmail_connections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!gmailConnection) {
    return { error: "Connect Gmail before sending." };
  }

  const { count: existingDrafts } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "draft");

  if ((existingDrafts ?? 0) > 0) {
    redirect("/review");
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count: sentToday } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent")
    .gte("sent_at", startOfToday.toISOString());

  const remainingCap = DAILY_SEND_CAP - (sentToday ?? 0);
  if (remainingCap <= 0) {
    return { error: "Daily send cap reached for today." };
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

  const toPrepare = due.slice(0, remainingCap);
  if (toPrepare.length === 0) {
    return { error: "No contacts are due for an email right now." };
  }

  const draftRows = toPrepare.map(({ contact, step }) => {
    const { subject, body } = renderEmail(step, profile, contact);
    const attachmentFilename =
      contact.attachment_filename ?? profile.default_attachment_filename ?? null;

    return {
      user_id: user.id,
      contact_id: contact.id,
      sequence_step: step,
      subject,
      body,
      status: "draft" as const,
      attachment_filename: attachmentFilename,
    };
  });

  const { error } = await supabase.from("emails").insert(draftRows);
  if (error) {
    return { error: error.message };
  }

  redirect("/review");
}
