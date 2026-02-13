import { NextResponse } from "next/server";
import { searchLegalText } from "@/lib/legal/search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ error: "Query manquante." }, { status: 400 });
  }

  const results = await searchLegalText(query);
  return NextResponse.json({ results });
}
