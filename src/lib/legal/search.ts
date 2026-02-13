import { prisma } from "@/lib/prisma";

type SearchResult = {
  id: string;
  documentTitle: string;
  articleCode?: string | null;
  content: string;
};

export async function searchLegalText(query: string) {
  const q = query.trim();
  if (!q) return [];

  const chunks = await prisma.legalChunk.findMany({
    where: {
      content: {
        contains: q,
        mode: "insensitive",
      },
    },
    include: {
      document: true,
      article: true,
    },
    orderBy: {
      document: {
        source: {
          priority: "asc",
        },
      },
    },
    take: 8,
  });

  return chunks.map((chunk): SearchResult => ({
    id: chunk.id,
    documentTitle: chunk.document.title,
    articleCode: chunk.article?.articleCode ?? null,
    content: chunk.content,
  }));
}
