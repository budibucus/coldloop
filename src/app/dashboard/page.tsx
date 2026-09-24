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

  return (
    <main className="mx-auto mt-24 w-full max-w-md px-4">
      <h1 className="mb-4 text-2xl font-semibold">Coldloop</h1>
      <p className="mb-6 text-sm text-zinc-500">Signed in as {user.email}</p>
      <SignOutButton />
    </main>
  );
}
