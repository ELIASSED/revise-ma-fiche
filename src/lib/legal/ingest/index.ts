import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { chunkText } from "../chunk";

type ArticleInput = {
  articleCode: string;
  title?: string;
  content: string;
  effectiveAt?: string;
  effectiveTo?: string;
};

type DocumentInput = {
  source: {
    name: string;
    type: string;
    url?: string;
    priority?: number;
  };
  title: string;
  code?: string;
  jurisdiction?: string;
  versionFrom?: string;
  versionTo?: string;
  articles: ArticleInput[];
};

export async function seedSources() {
  const sources = [
    { name: "Code du travail (Legifrance)", type: "legifrance", priority: 1 },
    { name: "Conventions collectives (Legifrance)", type: "legifrance", priority: 2 },
    { name: "URSSAF", type: "urssaf", priority: 3 },
    { name: "BOFiP", type: "bofip", priority: 4 },
    { name: "Jurisprudence (sélectionnée)", type: "jurisprudence", priority: 5 },
  ];

  for (const source of sources) {
    const exists = await prisma.legalSource.findFirst({
      where: { name: source.name },
    });
    if (!exists) {
      await prisma.legalSource.create({ data: source });
    }
  }
}

export async function ingestFromFile(filePath: string) {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const raw = await fs.readFile(absolute, "utf-8");
  const input = JSON.parse(raw) as DocumentInput;

  const source =
    (await prisma.legalSource.findFirst({
      where: { name: input.source.name },
    })) ??
    (await prisma.legalSource.create({
      data: {
        name: input.source.name,
        type: input.source.type,
        url: input.source.url,
        priority: input.source.priority ?? 99,
      },
    }));

  const document = await prisma.legalDocument.create({
    data: {
      sourceId: source.id,
      title: input.title,
      code: input.code,
      jurisdiction: input.jurisdiction,
      versionFrom: input.versionFrom ? new Date(input.versionFrom) : null,
      versionTo: input.versionTo ? new Date(input.versionTo) : null,
    },
  });

  for (const article of input.articles) {
    const created = await prisma.legalArticle.create({
      data: {
        documentId: document.id,
        articleCode: article.articleCode,
        title: article.title,
        content: article.content,
        effectiveAt: article.effectiveAt ? new Date(article.effectiveAt) : null,
        effectiveTo: article.effectiveTo ? new Date(article.effectiveTo) : null,
      },
    });

    const chunks = chunkText(article.content);
    for (const chunk of chunks) {
      await prisma.legalChunk.create({
        data: {
          documentId: document.id,
          articleId: created.id,
          content: chunk,
        },
      });
    }
  }

  return { documentId: document.id };
}
