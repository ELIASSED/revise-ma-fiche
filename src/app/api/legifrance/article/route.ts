import { NextResponse } from "next/server";
import { legifranceGetArticle } from "@/lib/legal/legifrance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "id manquant." }, { status: 400 });
  }

  const result = await legifranceGetArticle(id);
  return NextResponse.json(result);
}
