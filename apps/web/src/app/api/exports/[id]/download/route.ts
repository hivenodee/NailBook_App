import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/exports/:id/download — download CSV file
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const { id } = await params;
  const job = await prisma.exportJob.findUnique({
    where: { id },
  });

  if (!job || job.providerId !== user.provider.id) {
    return error("Not found", 404);
  }

  if (job.status !== "COMPLETED" || !job.content) {
    return error("Export not ready", 404);
  }

  const today = new Date().toISOString().split("T")[0];
  const filename = `nailbook-${job.type.toLowerCase()}-${today}.csv`;

  return new Response(job.content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
