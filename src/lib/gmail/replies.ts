import { google } from "googleapis";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Gmail search's `after:` operand is day-granularity, not time-of-day, so a
// reply on the same calendar day as our send could in rare cases be missed
// or (harmlessly) double-counted. Acceptable for a manual, button-triggered
// check on a 3-day follow-up cadence.
export function formatGmailSearchDate(date: Date): string {
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`;
}

export function isInsufficientScopeError(err: unknown): boolean {
  const message =
    err && typeof err === "object" && "message" in err ? String(err.message) : "";
  return message.toLowerCase().includes("insufficient authentication scopes");
}

export async function hasRepliedSince(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  contactEmail: string,
  since: Date,
): Promise<boolean> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: `from:${contactEmail} after:${formatGmailSearchDate(since)}`,
    maxResults: 1,
  });
  return (res.data.messages?.length ?? 0) > 0;
}
