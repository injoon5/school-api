import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "apps/docs/openapi/openapi.json");

async function main() {
  const { app } = await import("../src/app.js");
  const response = await app.handle(
    new Request("http://localhost/docs/json"),
  );

  if (!response.ok) {
    throw new Error(`OpenAPI export failed: HTTP ${response.status}`);
  }

  const spec = await response.json();
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
