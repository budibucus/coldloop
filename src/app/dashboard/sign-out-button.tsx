"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUTTON_SECONDARY } from "@/lib/ui/button-styles";

export default function SignOutButton() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className={BUTTON_SECONDARY}>
      Sign out
    </button>
  );
}
