import Link from "next/link";
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
    <main className="mx-auto mt-24 w-full max-w-md px-4 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New campaign</h1>
        <Link href="/campaigns" className="text-sm text-zinc-500 underline">
          Back to campaigns
        </Link>
      </div>
      <CampaignForm />
    </main>
  );
}
