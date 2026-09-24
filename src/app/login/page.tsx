"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

function subscribe() {
  return () => {};
}

function getRedirectSnapshot() {
  return `${window.location.origin}/auth/callback`;
}

function getServerRedirectSnapshot() {
  return undefined;
}

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const redirectTo = useSyncExternalStore(
    subscribe,
    getRedirectSnapshot,
    getServerRedirectSnapshot,
  );

  return (
    <main className="mx-auto mt-24 w-full max-w-md px-4">
      <h1 className="mb-6 text-center text-2xl font-semibold">Coldloop</h1>
      {redirectTo && (
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          redirectTo={redirectTo}
        />
      )}
    </main>
  );
}
