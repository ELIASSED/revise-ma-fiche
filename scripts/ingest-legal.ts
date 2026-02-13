import { ingestFromFile } from "../src/lib/legal/ingest";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run ingest:legal -- data/legal/sample.json");
    process.exit(1);
  }
  const result = await ingestFromFile(filePath);
  console.log(`Ingested document ${result.documentId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
