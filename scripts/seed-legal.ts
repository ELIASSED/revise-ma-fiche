import { seedSources } from "../src/lib/legal/ingest";

async function main() {
  await seedSources();
  console.log("Legal sources seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
