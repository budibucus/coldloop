"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const redirectTo = useSyncExternalStore(
    subscribe,
    getRedirectSnapshot,
    getServerRedirectSnapshot,
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

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
