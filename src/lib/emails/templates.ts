import type { Database } from "@/lib/supabase/database.types";

type SenderProfile = Database["public"]["Tables"]["sender_profiles"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type SequenceStep = Database["public"]["Enums"]["email_sequence_step"];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function signOff(profile: SenderProfile): string {
  return profile.sender_title
    ? `${profile.sender_name}\n${profile.sender_title}, ${profile.company}`
    : `${profile.sender_name}\n${profile.company}`;
}

export function renderEmail(
  step: SequenceStep,
  profile: SenderProfile,
  contact: Contact,
): { subject: string; body: string } {
  const name = firstName(contact.name);
  const offering = profile.product_description
    ? ` ${profile.product_description}`
    : "";
  const notes = contact.personalization_notes
    ? ` ${contact.personalization_notes}.`
    : "";

  if (step === "initial") {
    return {
      subject: `Quick question, ${name}`,
      body: `Hi ${name},\n\nI'm ${profile.sender_name} from ${profile.company}.${offering}${notes}\n\nWould you be open to a quick chat this week?\n\nBest,\n${signOff(profile)}`,
    };
  }

  if (step === "followup1") {
    return {
      subject: `Re: Quick question, ${name}`,
      body: `Hi ${name},\n\nJust floating this back to the top of your inbox in case it got buried.${offering}\n\nWorth a quick chat?\n\nBest,\n${signOff(profile)}`,
    };
  }

  return {
    subject: `Re: Quick question, ${name}`,
    body: `Hi ${name},\n\nI'll leave it here for now — if the timing's ever right, feel free to reach out.\n\nBest,\n${signOff(profile)}`,
  };
}
