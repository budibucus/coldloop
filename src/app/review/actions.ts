"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGmailClientForUser, sendGmailMessage } from "@/lib/gmail/client";
import { downloadAttachment } from "@/lib/storage/attachments";

export type DraftActionState = { error: string } | null;
export type ConfirmSendState = { error: string } | null;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function updateDraftEmail(
  _prevState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const { supabase, user } = await requireUser();

  const emailId = String(formData.get("email_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!subject || !body) {
    return { error: "Subject and body can't be empty." };
  }

  const { error } = await supabase
    .from("emails")
    .update({ subject, body })
    .eq("id", emailId)
    .eq("user_id", user.id)
    .eq("status", "draft");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/review");
  return null;
}

export async function discardDraftEmail(
  _prevState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const { supabase, user } = await requireUser();

  const emailId = String(formData.get("email_id") ?? "");

  const { error } = await supabase
    .from("emails")
    .delete()
    .eq("id", emailId)
    .eq("user_id", user.id)
    .eq("status", "draft");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/review");
  return null;
}

export async function confirmAndSendAll(
  _prevState: ConfirmSendState,
  _formData: FormData,
): Promise<ConfirmSendState> {
  const { supabase, user } = await requireUser();

  const gmailClient = await getGmailClientForUser(supabase, user.id);
  if (!gmailClient) {
    return { error: "Connect Gmail before sending." };
  }

  const { data: drafts, error: draftsError } = await supabase
    .from("emails")
    .select("id, contact_id, subject, body, sequence_step, attachment_filename")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  if (draftsError) {
    return { error: draftsError.message };
  }
  if (!drafts || drafts.length === 0) {
    return { error: "Nothing to send." };
  }

  const contactIds = [...new Set(drafts.map((d) => d.contact_id))];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email, attachment_path")
    .in("id", contactIds);
  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const { data: profile } = await supabase
    .from("sender_profiles")
    .select("default_attachment_path")
    .eq("user_id", user.id)
    .maybeSingle();

  let sent = 0;
  let failed = 0;

  for (const draft of drafts) {
    const contact = contactById.get(draft.contact_id);
    if (!contact) {
      failed += 1;
      await supabase.from("emails").update({ status: "failed" }).eq("id", draft.id);
      continue;
    }

    let attachment:
      | { filename: string; content: Buffer; mimeType: string }
      | undefined;
    const attachmentPath = contact.attachment_path ?? profile?.default_attachment_path ?? null;
    if (attachmentPath && draft.attachment_filename) {
      const downloaded = await downloadAttachment(supabase, attachmentPath);
      if (downloaded) {
        attachment = {
          filename: draft.attachment_filename,
          content: downloaded.buffer,
          mimeType: downloaded.mimeType,
        };
      }
    }

    try {
      await sendGmailMessage(gmailClient.oauth2Client, {
        from: gmailClient.gmailAddress,
        to: contact.email,
        subject: draft.subject,
        body: draft.body,
        attachment,
      });

      await supabase
        .from("emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", draft.id);

      if (draft.sequence_step === "initial") {
        await supabase
          .from("contacts")
          .update({ status: "sent" })
          .eq("id", draft.contact_id);
      }

      sent += 1;
    } catch {
      await supabase.from("emails").update({ status: "failed" }).eq("id", draft.id);
      failed += 1;
    }
  }

  revalidatePath("/review");
  revalidatePath("/contacts");

  redirect(`/dashboard?batch=sent&sent=${sent}&failed=${failed}`);
}
