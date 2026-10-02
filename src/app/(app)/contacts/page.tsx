import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddContactForm from "./add-contact-form";
import ImportCsvForm from "./import-csv-form";
import StatusBadge from "@/components/status-badge";

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
    <div>
      <section className="mb-8 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          Add a contact
        </h2>
        <AddContactForm />
      </section>

      <section className="mb-8 rounded border border-zinc-200 p-4 dark:border-zinc-800">
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
          <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Attachment</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-2">{contact.name}</td>
                    <td className="px-4 py-2">{contact.email}</td>
                    <td className="px-4 py-2">{contact.company ?? "—"}</td>
                    <td className="px-4 py-2">
                      {contact.attachment_filename ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={contact.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No contacts yet.</p>
        )}
      </section>
    </div>
  );
}
