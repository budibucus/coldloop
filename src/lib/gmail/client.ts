import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getGoogleOAuthClient } from "./oauth";
import { encrypt, decrypt } from "./encryption";

type GmailConnectionUpdate =
  Database["public"]["Tables"]["gmail_connections"]["Update"];

export async function getGmailClientForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: connection } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) {
    return null;
  }

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: decrypt(connection.encrypted_access_token),
    refresh_token: decrypt(connection.encrypted_refresh_token),
    expiry_date: connection.token_expires_at
      ? new Date(connection.token_expires_at).getTime()
      : undefined,
  });

  oauth2Client.on("tokens", (tokens) => {
    const update: GmailConnectionUpdate = {};
    if (tokens.access_token) {
      update.encrypted_access_token = encrypt(tokens.access_token);
    }
    if (tokens.refresh_token) {
      update.encrypted_refresh_token = encrypt(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      update.token_expires_at = new Date(tokens.expiry_date).toISOString();
    }
    if (Object.keys(update).length > 0) {
      void supabase
        .from("gmail_connections")
        .update(update)
        .eq("user_id", userId);
    }
  });

  return { oauth2Client, gmailAddress: connection.gmail_address };
}

export type GmailAttachment = {
  filename: string;
  content: Buffer;
  mimeType: string;
};

function buildRawMessage(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachment?: GmailAttachment;
}): string {
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
  ];

  let message: string;

  if (params.attachment) {
    const boundary = `coldloop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const base64Content = params.attachment.content
      .toString("base64")
      .replace(/.{76}/g, "$&\r\n");

    message = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      params.body,
      "",
      `--${boundary}`,
      `Content-Type: ${params.attachment.mimeType}; name="${params.attachment.filename}"`,
      `Content-Disposition: attachment; filename="${params.attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Content,
      "",
      `--${boundary}--`,
    ].join("\r\n");
  } else {
    message = [
      ...headers,
      "Content-Type: text/plain; charset=utf-8",
      "",
      params.body,
    ].join("\r\n");
  }

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailMessage(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    attachment?: GmailAttachment;
  },
): Promise<void> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage(params) },
  });
}
