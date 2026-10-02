import { google } from "googleapis";

// `gmail.send` alone can't call `users.getProfile` (Google returns 403
// "insufficient authentication scopes" -- that endpoint needs readonly/
// metadata/etc). We only need the connected address, so request the
// plain `email` scope for that instead of a broader, sensitive Gmail scope.
// gmail.readonly is needed to check the inbox for replies (Phase 7). Anyone
// who connected Gmail before this scope was added needs to reconnect --
// their stored token won't carry it, and Gmail will 403 with "insufficient
// authentication scopes" until they do (same failure shape as the
// getProfile issue this file's first comment documents).
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}
