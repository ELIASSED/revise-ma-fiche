import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { appConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { jobId, accessToken } = body ?? {};

  if (!jobId || !accessToken) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.accessToken !== accessToken) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { jobId },
  });

  if (existingPayment?.status === "PAID") {
    return NextResponse.json({
      url: `${appConfig.baseUrl}/report/${jobId}?token=${accessToken}`,
    });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Analyse fiche de paie" },
          unit_amount: 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      jobId,
    },
    success_url: `${appConfig.baseUrl}/report/${jobId}?token=${accessToken}&paid=1`,
    cancel_url: `${appConfig.baseUrl}/report/${jobId}?token=${accessToken}&cancel=1`,
  });

  await prisma.payment.upsert({
    where: { jobId },
    create: {
      jobId,
      stripeSessionId: session.id,
      amountCents: 100,
      status: "PENDING",
    },
    update: {
      stripeSessionId: session.id,
      amountCents: 100,
      status: "PENDING",
    },
  });

  return NextResponse.json({ url: session.url });
}
