import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddContactForm from "./add-contact-form";
import ImportCsvForm from "./import-csv-form";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, company, status, attachment_filename")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto mt-24 w-full max-w-2xl px-4 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Link href="/dashboard" className="text-sm text-zinc-500 underline">
          Back to dashboard
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          Add a contact
        </h2>
        <AddContactForm />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          Or paste a CSV
        </h2>
        <ImportCsvForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          {contacts?.length ?? 0} contact{contacts?.length === 1 ? "" : "s"}
        </h2>
        {contacts && contacts.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 font-medium">Attachment</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 pr-4">{contact.name}</td>
                  <td className="py-2 pr-4">{contact.email}</td>
                  <td className="py-2 pr-4">{contact.company ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {contact.attachment_filename ?? "—"}
                  </td>
                  <td className="py-2">{contact.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-500">No contacts yet.</p>
        )}
      </section>
    </main>
  );
}
