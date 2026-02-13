import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { appConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${appConfig.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.analysisJob.findMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  for (const job of expired) {
    await deleteFile(job.filePath);
  }

  await prisma.analysisJob.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  return NextResponse.json({ deleted: expired.length });
}
