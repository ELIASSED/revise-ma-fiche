export const appConfig = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  smicHourly: Number(process.env.SMIC_HOURLY_EUR || 11.65),
  smicMonthly: Number(process.env.SMIC_MONTHLY_EUR || 1766.92),
  enableOcrScan: process.env.ENABLE_OCR_SCAN === "true",
  storageRoot: process.env.STORAGE_ROOT || "storage/uploads",
  cronSecret: process.env.CRON_SECRET || "change-me",
};
