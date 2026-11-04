// Lets a test import app code as Next.js does: paths without an extension, "@/…", and JSON without an import attribute.
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, next) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!relative && !specifier.startsWith("@/")) return next(specifier, context);
    const url = specifier.startsWith("@/") ? new URL(specifier.slice(2), SRC) : new URL(specifier, context.parentURL);
    const path = fileURLToPath(url);
    const found = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`].find((p) => existsSync(p) && !p.endsWith("/"));
    return found && /\.(ts|tsx|json)$/.test(found) ? { url: pathToFileURL(found).href, shortCircuit: true } : next(specifier, context);
  },
  load(url, context, next) {
    if (!url.endsWith(".json")) return next(url, context);
    return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")}`, shortCircuit: true };
  },
});
