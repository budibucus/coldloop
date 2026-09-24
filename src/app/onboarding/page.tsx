import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("sender_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto mt-24 w-full max-w-md px-4 pb-24">
      <h1 className="mb-2 text-2xl font-semibold">
        {profile ? "Edit your profile" : "Set up your profile"}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        This is used to personalize the emails Coldloop sends on your behalf.
      </p>
      <OnboardingForm profile={profile} />
    </main>
  );
}
