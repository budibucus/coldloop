"use server";

import Papa from "papaparse";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachment } from "@/lib/storage/attachments";

export type ContactFormState = { error: string } | null;
export type CsvImportState = { error: string } | { imported: number; skipped: number } | null;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function addContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const personalizationNotes = String(
    formData.get("personalization_notes") ?? "",
  ).trim();

  if (!name || !email) {
    return { error: "Name and email are required." };
  }

  let attachmentPath: string | null = null;
  let attachmentFilename: string | null = null;

  const attachmentFile = formData.get("attachment");
  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    const result = await uploadAttachment(supabase, user.id, "contacts", attachmentFile);
    if ("error" in result) {
      return { error: result.error };
    }
    attachmentPath = result.path;
    attachmentFilename = result.filename;
  }

  const { error } = await supabase.from("contacts").insert({
    user_id: user.id,
    name,
    email,
    company: company || null,
    personalization_notes: personalizationNotes || null,
    attachment_path: attachmentPath,
    attachment_filename: attachmentFilename,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contacts");
  return null;
}

const NAME_ALIASES = ["name", "full_name", "full name"];
const EMAIL_ALIASES = ["email", "email_address", "email address"];
const COMPANY_ALIASES = ["company", "organization"];
const NOTES_ALIASES = ["personalization_notes", "notes", "personalization notes"];

function pick(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias];
    if (value) return value.trim();
  }
  return "";
}

export async function importContactsCsv(
  _prevState: CsvImportState,
  formData: FormData,
): Promise<CsvImportState> {
  const { supabase, user } = await requireUser();

  const csvText = String(formData.get("csv") ?? "").trim();
  if (!csvText) {
    return { error: "Paste some CSV text first." };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    return { error: `Could not parse CSV: ${parsed.errors[0].message}` };
  }

  const rows: { user_id: string; name: string; email: string; company: string | null; personalization_notes: string | null }[] = [];
  let skipped = 0;

  for (const row of parsed.data) {
    const name = pick(row, NAME_ALIASES);
    const email = pick(row, EMAIL_ALIASES);
    if (!name || !email) {
      skipped += 1;
      continue;
    }
    rows.push({
      user_id: user.id,
      name,
      email,
      company: pick(row, COMPANY_ALIASES) || null,
      personalization_notes: pick(row, NOTES_ALIASES) || null,
    });
  }

  if (rows.length === 0) {
    return { error: "No valid rows found. Each row needs at least a name and email." };
  }

  const { error } = await supabase.from("contacts").insert(rows);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contacts");
  return { imported: rows.length, skipped };
}
