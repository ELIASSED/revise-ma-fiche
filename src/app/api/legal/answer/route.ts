import { NextResponse } from "next/server";
import { searchLegalText } from "@/lib/legal/search";
import { groqChat } from "@/lib/legal/groq";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const question = (body?.question || "").trim();

  if (!question) {
    return NextResponse.json({ error: "Question manquante." }, { status: 400 });
  }

  const results = await searchLegalText(question);
  const context = results
    .map(
      (r, index) =>
        `Source ${index + 1} — ${r.documentTitle}${
          r.articleCode ? ` (${r.articleCode})` : ""
        }\n${r.content}`
    )
    .join("\n\n");

  const system =
    "Tu es un assistant juridique. Réponds uniquement à partir des sources fournies. " +
    "Si les sources sont insuffisantes, dis-le clairement. Cite les sources par numéro.";

  const answer = await groqChat([
    { role: "system", content: system },
    { role: "user", content: `Question: ${question}\n\nSources:\n${context}` },
  ]);

  return NextResponse.json({ answer, sources: results });
}
