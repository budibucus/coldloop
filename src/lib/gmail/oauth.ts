import { google } from "googleapis";

// `gmail.send` alone can't call `users.getProfile` (Google returns 403
// "insufficient authentication scopes" -- that endpoint needs readonly/
// metadata/etc). We only need the connected address, so request the
// plain `email` scope for that instead of a broader, sensitive Gmail scope.
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}
