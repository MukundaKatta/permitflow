#!/usr/bin/env tsx
/**
 * CLI script to ingest regulations into the database.
 * Usage: pnpm --filter @permitflow/regulations ingest [--state NV]
 */
import { checkForUpdates, updateForState } from "./updater";

async function main() {
  const args = process.argv.slice(2);
  const stateIndex = args.indexOf("--state");
  const state = stateIndex !== -1 ? args[stateIndex + 1] : null;

  console.log("Starting regulation ingestion...\n");

  let results;
  if (state) {
    console.log(`Targeting state: ${state}\n`);
    results = await updateForState(state);
  } else {
    console.log("Running full ingestion across all jurisdictions...\n");
    results = await checkForUpdates();
  }

  console.log("\n=== Ingestion Results ===\n");
  for (const result of results) {
    console.log(`${result.jurisdiction}:`);
    console.log(`  Regulations processed: ${result.regulationsProcessed}`);
    console.log(`  Chunks created: ${result.chunksCreated}`);
    if (result.errors.length > 0) {
      console.log(`  Errors (${result.errors.length}):`);
      for (const error of result.errors) {
        console.log(`    - ${error}`);
      }
    }
    console.log();
  }

  const totalRegs = results.reduce((sum, r) => sum + r.regulationsProcessed, 0);
  const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  console.log(`Total: ${totalRegs} regulations, ${totalChunks} chunks, ${totalErrors} errors`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
