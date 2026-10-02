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
    <div className="max-w-md">
      <h2 className="mb-2 text-xl font-semibold">
        {profile ? "Edit your profile" : "Set up your profile"}
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        This is used to personalize the emails Coldloop sends on your behalf.
      </p>
      <OnboardingForm profile={profile} />
    </div>
  );
}
