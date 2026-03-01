import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type ClientRow = {
  email: string;
  name?: string;
  phone?: string;
  notes?: string;
};

function parseCSV(text: string): ClientRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header row — normalize to lowercase, trim
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  // Map common header variations
  const emailIdx = headers.findIndex((h) =>
    ["email", "e-mail", "email address", "emailaddress", "client email"].includes(h)
  );
  const nameIdx = headers.findIndex((h) =>
    ["name", "full name", "fullname", "client name", "client", "first name", "firstname"].includes(h)
  );
  const lastNameIdx = headers.findIndex((h) =>
    ["last name", "lastname", "surname"].includes(h)
  );
  const phoneIdx = headers.findIndex((h) =>
    ["phone", "phone number", "phonenumber", "mobile", "cell", "telephone", "client phone"].includes(h)
  );
  const notesIdx = headers.findIndex((h) =>
    ["notes", "note", "comments", "memo"].includes(h)
  );

  if (emailIdx === -1) return [];

  const rows: ClientRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV parsing (handles quoted fields with commas)
    const fields = parseCsvLine(lines[i]);
    const email = fields[emailIdx]?.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;

    let name = nameIdx >= 0 ? fields[nameIdx]?.trim() : undefined;
    if (lastNameIdx >= 0 && fields[lastNameIdx]?.trim()) {
      const lastName = fields[lastNameIdx].trim();
      name = name ? `${name} ${lastName}` : lastName;
    }

    rows.push({
      email,
      name: name || undefined,
      phone: phoneIdx >= 0 ? fields[phoneIdx]?.trim() || undefined : undefined,
      notes: notesIdx >= 0 ? fields[notesIdx]?.trim() || undefined : undefined,
    });
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.replace(/^["']|["']$/g, ""));
  return fields;
}

// POST /api/imports/clients — import clients from CSV
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const providerId = user.provider.id;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return error("No file provided", 400);
  if (file.size > 5 * 1024 * 1024) return error("File too large (max 5MB)", 400);

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return error("No valid client rows found. Make sure your CSV has an 'email' column.", 422);
  }

  if (rows.length > 5000) {
    return error("Too many rows (max 5,000 per import)", 400);
  }

  // Upsert each client (skip duplicates by email)
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const existing = await prisma.providerClient.findUnique({
        where: { providerId_email: { providerId, email: row.email } },
      });

      if (existing) {
        // Only update if we have new data
        const updates: Record<string, string> = {};
        if (row.name && !existing.name) updates.name = row.name;
        if (row.phone && !existing.phone) updates.phone = row.phone;
        if (row.notes && !existing.notes) updates.notes = row.notes;

        if (Object.keys(updates).length > 0) {
          await prisma.providerClient.update({
            where: { id: existing.id },
            data: updates,
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.providerClient.create({
          data: {
            providerId,
            email: row.email,
            name: row.name,
            phone: row.phone,
            notes: row.notes,
          },
        });
        created++;
      }
    } catch {
      skipped++;
    }
  }

  return success({ total: rows.length, created, updated, skipped });
}
