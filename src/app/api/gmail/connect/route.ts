import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleOAuthClient, GMAIL_SCOPES } from "@/lib/gmail/oauth";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: allowed } = await supabase
    .from("allowed_senders")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!allowed) {
    return NextResponse.redirect(`${origin}/dashboard?gmail=not_allowed`);
  }

  const state = randomBytes(16).toString("hex");
  const oauth2Client = getGoogleOAuthClient(`${origin}/api/gmail/callback`);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
