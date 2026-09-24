import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("sender_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto mt-24 w-full max-w-md px-4">
      <h1 className="mb-4 text-2xl font-semibold">Coldloop</h1>
      <p className="mb-6 text-sm text-zinc-500">Signed in as {user.email}</p>
      <div className="flex items-center gap-3">
        <Link
          href="/onboarding"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Edit profile
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
