import { google } from "googleapis";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

export function getGoogleOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}
