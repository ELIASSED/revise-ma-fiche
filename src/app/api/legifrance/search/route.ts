import { NextResponse } from "next/server";
import { legifranceSearch } from "@/lib/legal/legifrance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body || !body.fond || !body.recherche) {
    return NextResponse.json(
      { error: "Payload invalide. Requiert fond + recherche." },
      { status: 400 }
    );
  }

  const result = await legifranceSearch(body);
  return NextResponse.json(result);
}
