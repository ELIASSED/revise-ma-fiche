import { prisma } from "@/lib/prisma";
import {
  legifranceGetArticle,
  legifranceSearch,
} from "@/lib/legal/legifrance";
import { chunkText } from "@/lib/legal/chunk";

type SearchResponse = Record<string, unknown>;

function findArray(obj: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(obj)) return obj as Array<Record<string, unknown>>;
  if (obj && typeof obj === "object") {
    for (const value of Object.values(obj)) {
      const found = findArray(value);
      if (found.length) return found;
    }
  }
  return [];
}

function findString(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractArticleId(item: Record<string, unknown>) {
  const candidates = ["id", "idArticle", "idTexte", "cid", "idText"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.startsWith("LEGIARTI")) {
      return value;
    }
  }
  const anyId = candidates
    .map((key) => item[key])
    .find((value) => typeof value === "string");
  return typeof anyId === "string" ? anyId : null;
}

function extractArticleCode(item: Record<string, unknown>) {
  return (
    findString(item, ["num", "numero", "article", "numArticle", "code"]) ??
    null
  );
}

function extractTitle(item: Record<string, unknown>) {
  return findString(item, ["titre", "title", "intitule"]);
}

function extractTextFromArticle(article: Record<string, unknown>) {
  return (
    findString(article, ["texte", "content", "text", "texteHtml"]) ??
    JSON.stringify(article)
  );
}

export async function ingestLegifranceFromSearch(params: {
  sourceName: string;
  documentTitle: string;
  payload: Record<string, unknown>;
  maxPages?: number;
}) {
  const source =
    (await prisma.legalSource.findFirst({
      where: { name: params.sourceName },
    })) ??
    (await prisma.legalSource.create({
      data: { name: params.sourceName, type: "legifrance", priority: 1 },
    }));

  const document = await prisma.legalDocument.create({
    data: {
      sourceId: source.id,
      title: params.documentTitle,
      jurisdiction: "FR",
    },
  });

  const maxPages = params.maxPages ?? 5;
  let pageNumber = 1;
  let inserted = 0;

  while (pageNumber <= maxPages) {
    const payload = {
      ...params.payload,
      recherche: {
        ...(params.payload.recherche as Record<string, unknown>),
        pageNumber,
      },
    };

    const response = (await legifranceSearch(payload)) as SearchResponse;
    const results = findArray(response);
    if (!results.length) break;

    for (const item of results) {
      const id = extractArticleId(item);
      if (!id) continue;

      const articleResponse = (await legifranceGetArticle(id)) as Record<
        string,
        unknown
      >;
      const content = extractTextFromArticle(articleResponse);
      const code = extractArticleCode(item) ?? id;
      const title = extractTitle(item) ?? params.documentTitle;

      const article = await prisma.legalArticle.create({
        data: {
          documentId: document.id,
          articleCode: code,
          title,
          content,
        },
      });

      const chunks = chunkText(content);
      for (const chunk of chunks) {
        await prisma.legalChunk.create({
          data: {
            documentId: document.id,
            articleId: article.id,
            content: chunk,
          },
        });
      }

      inserted += 1;
    }

    pageNumber += 1;
  }

  return { documentId: document.id, inserted };
}
