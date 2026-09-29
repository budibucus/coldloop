import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getGoogleOAuthClient } from "@/lib/gmail/oauth";
import { encrypt } from "@/lib/gmail/encryption";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/dashboard?gmail=denied`);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("gmail/callback: state check failed", {
      hasCode: !!code,
      hasState: !!state,
      hasExpectedState: !!expectedState,
      stateMatches: state === expectedState,
    });
    return NextResponse.redirect(`${origin}/dashboard?gmail=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const oauth2Client = getGoogleOAuthClient(`${origin}/api/gmail/callback`);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      console.error("gmail/callback: missing tokens from Google", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
      });
      return NextResponse.redirect(`${origin}/dashboard?gmail=error`);
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userinfo = await oauth2.userinfo.get();
    const gmailAddress = userinfo.data.email;

    if (!gmailAddress) {
      console.error("gmail/callback: no email in userinfo response");
      return NextResponse.redirect(`${origin}/dashboard?gmail=error`);
    }

    const { error: dbError } = await supabase.from("gmail_connections").upsert({
      user_id: user.id,
      gmail_address: gmailAddress,
      encrypted_access_token: encrypt(tokens.access_token),
      encrypted_refresh_token: encrypt(tokens.refresh_token),
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
    });

    if (dbError) {
      console.error("gmail/callback: db upsert failed", dbError);
      return NextResponse.redirect(`${origin}/dashboard?gmail=error`);
    }

    return NextResponse.redirect(`${origin}/dashboard?gmail=connected`);
  } catch (err) {
    console.error("gmail/callback: unhandled error", err);
    return NextResponse.redirect(`${origin}/dashboard?gmail=error`);
  }
}
