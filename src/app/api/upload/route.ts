import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadFile, deleteFile, loadAndDecryptFile } from "@/lib/storage";
import { extractText, runRules } from "@/lib/analysis";
import { isAllowedMime, sniffMimeType } from "@/lib/mime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMimeType(buffer);
  const effectiveMime = (isAllowedMime(sniffed) ? sniffed : mimeType) as string;
  const isPdf = effectiveMime === "application/pdf";

  if (!isAllowedMime(effectiveMime)) {
    return NextResponse.json(
      { error: "Formats acceptés: PDF ou image (MIME invalide)." },
      { status: 400 }
    );
  }
  const accessToken = crypto.randomUUID();

  const job = await prisma.analysisJob.create({
    data: {
      status: "PROCESSING",
      sourceType: "unknown",
      filePath: "",
      accessToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const extension = isPdf ? ".pdf" : ".img";
  const filePath = await saveUploadFile(job.id, buffer, extension);

  try {
    // Déchiffrer le fichier pour le traitement
    const decryptedBuffer = await loadAndDecryptFile(filePath);
    const { text, sourceType } = await extractText(decryptedBuffer, effectiveMime);
    const result = runRules(text);

    // Supprimer immédiatement le fichier chiffré après traitement
    await deleteFile(filePath);

    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "READY",
        sourceType,
        filePath: "", // Ne plus stocker le chemin après suppression
        resultJson: result,
      },
    });
  } catch (err) {
    // Supprimer le fichier même en cas d'erreur
    await deleteFile(filePath);
    
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        sourceType: "unknown",
        filePath: "", // Ne plus stocker le chemin après suppression
        errorMessage:
          err instanceof Error ? err.message : "Erreur inconnue.",
      },
    });
  }

  return NextResponse.json({ jobId: job.id, accessToken });
}
