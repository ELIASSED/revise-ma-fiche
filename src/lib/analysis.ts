import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { appConfig } from "./config";

type Anomaly = {
  code: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  confidence: number;
};

export type AnalysisResult = {
  score: number;
  anomalies: Anomaly[];
  extracted: Record<string, string | number | null>;
};

function normalizeText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(input: string) {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractAmountNear(text: string, label: RegExp) {
  const match = text.match(new RegExp(`${label.source}[\\s\\S]{0,60}`, "i"));
  if (!match) return null;
  const amountMatch = match[0].match(
    /(\d{1,3}(?:[ .]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})/i
  );
  return amountMatch ? toNumber(amountMatch[1]) : null;
}

function extractHours(text: string) {
  const match = text.match(/(\d{1,3}(?:[,.]\d{1,2})?)\s*h(?:eures?)?/i);
  return match ? toNumber(match[1]) : null;
}

async function runOcr(buffer: Buffer) {
  const worker = await createWorker("fra");
  const {
    data: { text },
  } = await worker.recognize(buffer);
  await worker.terminate();
  return text;
}

async function extractTextFromPdfImages(parser: PDFParse) {
  const images = await parser.getImage({
    imageBuffer: true,
    imageDataUrl: false,
    imageThreshold: 120,
  });

  const pages = images?.pages ?? [];
  let best: { data: Uint8Array } | null = null;
  let bestSize = 0;

  for (const page of pages) {
    for (const img of page.images || []) {
      const size = img.data?.byteLength ?? 0;
      if (size > bestSize && img.data) {
        best = img;
        bestSize = size;
      }
    }
  }

  if (!best || !best.data) {
    throw new Error("Aucune image exploitable pour OCR.");
  }

  return runOcr(Buffer.from(best.data));
}

export async function extractText(buffer: Buffer, mimeType: string) {
  if (mimeType.startsWith("image/")) {
    if (!appConfig.enableOcrScan) {
      throw new Error(
        "L'image nécessite OCR. Activez ENABLE_OCR_SCAN=true pour OCR."
      );
    }
    const ocrText = await runOcr(buffer);
    return { text: normalizeText(ocrText), sourceType: "image" };
  }

  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText({ lineEnforce: true, cellSeparator: " " });
  const text = normalizeText(parsed.text || "");
  if (text.length > 80) {
    await parser.destroy();
    return { text, sourceType: "pdf_text" };
  }

  if (!appConfig.enableOcrScan) {
    await parser.destroy();
    throw new Error(
      "Le fichier semble scanné. Activez ENABLE_OCR_SCAN=true pour OCR."
    );
  }

  const ocrText = await extractTextFromPdfImages(parser);
  await parser.destroy();
  return { text: normalizeText(ocrText), sourceType: "pdf_scan" };
}

export function runRules(text: string): AnalysisResult {
  const anomalies: Anomaly[] = [];
  const normalized = normalizeText(text);

  const brut = extractAmountNear(normalized, /salaire\s+brut|brut/i);
  const net = extractAmountNear(
    normalized,
    /net\s*(à|a)\s*payer|net\s+a\s+payer/i
  );
  const base = extractAmountNear(normalized, /salaire de base/i);
  const hours = extractHours(normalized);
  const retenues = extractAmountNear(
    normalized,
    /total\s+retenues|retenues\s+salariales/i
  );
  const pas = extractAmountNear(normalized, /pr[ée]l[èe]vement\s+à\s+la\s+source|p\.a\.s/i);

  if (net !== null && brut !== null) {
    const ratio = net / brut;
    if (ratio < 0.65 || ratio > 0.9 || net > brut) {
      anomalies.push({
        code: "BRUT_NET_RATIO",
        title: "Brut/Net incohérent",
        description:
          "Le rapport brut/net semble atypique. Vérifiez les cotisations et les retenues.",
        severity: "medium",
        confidence: 0.6,
      });
    }
  }

  if (base !== null && hours !== null) {
    const hourly = base / hours;
    if (hourly < appConfig.smicHourly) {
      anomalies.push({
        code: "SMIC_HOURLY",
        title: "Salaire horaire sous le SMIC",
        description:
          "Le salaire de base divisé par les heures semble inférieur au SMIC horaire.",
        severity: "high",
        confidence: 0.65,
      });
    }
  }

  if (base !== null && appConfig.smicMonthly && base < appConfig.smicMonthly) {
    anomalies.push({
      code: "SMIC_MONTHLY",
      title: "Salaire de base sous le SMIC mensuel",
      description:
        "Le salaire de base semble inférieur au SMIC mensuel brut (à confirmer selon temps de travail).",
      severity: "high",
      confidence: 0.55,
    });
  }

  const hasMandatory =
    /siret/i.test(normalized) && /(p(é|e)riode|période)/i.test(normalized);
  if (!hasMandatory) {
    anomalies.push({
      code: "MANDATORY_FIELDS",
      title: "Mentions obligatoires manquantes",
      description:
        "Certaines mentions obligatoires semblent absentes (SIRET, période, etc.).",
      severity: "medium",
      confidence: 0.5,
    });
  }

  if (/heures?\s+sup/i.test(normalized)) {
    const hasMajoration =
      /125%|150%|1[,.]25|1[,.]5/.test(normalized) ||
      /majoration/i.test(normalized);
    if (!hasMajoration) {
      anomalies.push({
        code: "OVERTIME",
        title: "Heures sup potentiellement non majorées",
        description:
          "La fiche mentionne des heures sup sans majoration explicite.",
        severity: "medium",
        confidence: 0.55,
      });
    }
  }

  if (brut !== null && retenues !== null && net !== null) {
    const derived = brut - retenues - (pas ?? 0);
    if (Math.abs(derived - net) > 3) {
      anomalies.push({
        code: "NET_RECALC",
        title: "Net à payer incohérent",
        description:
          "Le net à payer recalculé à partir du brut et des retenues semble différent.",
        severity: "low",
        confidence: 0.45,
      });
    }
  }

  const score = Math.max(0, 100 - anomalies.length * 12);

  return {
    score,
    anomalies,
    extracted: {
      brut,
      net,
      base,
      hours,
      retenues,
      pas,
    },
  };
}
