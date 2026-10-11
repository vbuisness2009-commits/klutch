import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Read DATABASE_URL from .env.local
const envLocal = readFileSync(".env.local", "utf8");
const match = envLocal.match(/DATABASE_URL=["']?([^"'\n\r]+)["']?/);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const dbUrl = match[1];
const sql = neon(dbUrl);

console.log("Connecting to Neon database...");

const testsDir = join(process.cwd(), "content", "tests");
const files = readdirSync(testsDir).filter((f) => f.startsWith("practice-test-") && f.endsWith(".json"));

for (const file of files) {
  const fullPath = join(testsDir, file);
  const data = JSON.parse(readFileSync(fullPath, "utf8"));
  console.log(`Syncing ${data.id} (${data.title})...`);

  await sql`
    INSERT INTO tests (id, title, collection, source, published, scorable, warnings, form, created_at, updated_at)
    VALUES (${data.id}, ${data.title}, ${data.collection || "Full-Length Adaptive"}, ${data.source || "Official Format"},
            ${data.published !== false}, ${Boolean(data.scorable)}, ${JSON.stringify(data.warnings || [])}::jsonb,
            ${JSON.stringify(data.form)}::jsonb, ${data.uploadedAt || new Date().toISOString()}, now())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      collection = EXCLUDED.collection,
      source = EXCLUDED.source,
      published = EXCLUDED.published,
      scorable = EXCLUDED.scorable,
      warnings = EXCLUDED.warnings,
      form = EXCLUDED.form,
      updated_at = now()
  `;
}

console.log(`Successfully synced ${files.length} practice tests to Neon!`);
