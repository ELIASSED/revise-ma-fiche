import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requis." }, { status: 400 });
  }

  const { id } = await params;
  const job = await prisma.analysisJob.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!job || job.accessToken !== token) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    jobStatus: job.status,
    paymentStatus: job.payment?.status ?? null,
    result: job.payment?.status === "PAID" ? job.resultJson : null,
    errorMessage: job.errorMessage,
  });
}
