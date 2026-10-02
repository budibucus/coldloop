import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CampaignForm from "./campaign-form";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-md">
      <CampaignForm />
    </div>
  );
}
