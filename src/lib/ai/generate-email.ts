import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/lib/supabase/database.types";

type SenderProfile = Database["public"]["Tables"]["sender_profiles"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

const MODEL = "claude-opus-5";

export type GeneratedEmail = { subject: string; body: string };
export type GenerateEmailResult = GeneratedEmail | { error: string };

function buildContext(profile: SenderProfile, contact: Contact): string {
  return [
    `Sender: ${profile.sender_name}${profile.sender_title ? `, ${profile.sender_title}` : ""} at ${profile.company}.`,
    profile.product_description ? `What they offer: ${profile.product_description}` : null,
    profile.target_segments ? `Target audience: ${profile.target_segments}` : null,
    profile.tone ? `Desired tone: ${profile.tone}` : null,
    `Recipient: ${contact.name}${contact.company ? ` at ${contact.company}` : ""}.`,
    contact.personalization_notes
      ? `Personalization notes about the recipient: ${contact.personalization_notes}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM_PROMPT =
  'You write short, personalized cold outreach emails. Respond with ONLY a JSON object matching exactly this shape: {"subject": string, "body": string}. No markdown, no code fences, no extra commentary. The body is plain text with \\n for line breaks, no HTML.';

export async function generateEmailWithAI(params: {
  profile: SenderProfile;
  contact: Contact;
  instructions: string;
  existingDraft?: GeneratedEmail;
}): Promise<GenerateEmailResult> {
  const { profile, contact, instructions, existingDraft } = params;
  const context = buildContext(profile, contact);

  const userMessage = existingDraft
    ? `${context}\n\nCurrent draft:\nSubject: ${existingDraft.subject}\nBody: ${existingDraft.body}\n\nRevise it per these instructions: ${instructions || "Improve it."}`
    : `${context}\n\nInstructions: ${instructions}\n\nWrite the email now.`;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text = block.text;
        break;
      }
    }

    if (!text) {
      return { error: "AI did not return any text." };
    }

    const parsed = JSON.parse(text.trim());
    if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
      return { error: "AI response was not in the expected format." };
    }

    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { error: "Invalid Anthropic API key." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { error: "Rate limited by the AI provider. Try again shortly." };
    }
    if (err instanceof SyntaxError) {
      return { error: "AI response could not be parsed." };
    }
    return { error: err instanceof Error ? err.message : "AI generation failed." };
  }
}
