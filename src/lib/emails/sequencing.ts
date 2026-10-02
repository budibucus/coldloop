import type { Database } from "@/lib/supabase/database.types";

export const FOLLOWUP_INTERVAL_DAYS = 3;

type SequenceStep = Database["public"]["Enums"]["email_sequence_step"];
export type SentEmail = {
  contact_id: string;
  sequence_step: SequenceStep;
  sent_at: string | null;
};

export function nextStepFor(
  sentEmailsForContact: SentEmail[],
): { step: SequenceStep; dueAt: Date } | null {
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

export function filterEligibleForStep<T extends { id: string }>(
  contacts: T[],
  sentEmails: SentEmail[],
  step: SequenceStep,
  now: Date = new Date(),
): T[] {
  const byContact = groupSentEmailsByContact(sentEmails);
  return contacts.filter((contact) => {
    const next = nextStepFor(byContact.get(contact.id) ?? []);
    return next !== null && next.step === step && next.dueAt <= now;
  });
}

export function groupSentEmailsByContact(
  sentEmails: SentEmail[],
): Map<string, SentEmail[]> {
  const byContact = new Map<string, SentEmail[]>();
  for (const email of sentEmails) {
    const list = byContact.get(email.contact_id) ?? [];
    list.push(email);
    byContact.set(email.contact_id, list);
  }
  return byContact;
}
