import { NextResponse } from "next/server";
import { legifranceLegiPart } from "@/lib/legal/legifrance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const textId = body?.textId;
  const date = body?.date;
  if (!textId || !date) {
    return NextResponse.json(
      { error: "textId et date requis." },
      { status: 400 }
    );
  }

  const result = await legifranceLegiPart(textId, Number(date));
  return NextResponse.json(result);
}
