import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const repositoryData = resolve(webRoot, "..", "generated");
const publicData = resolve(webRoot, "public", "data");
const mapLibreWorkerSource = resolve(
  webRoot,
  "node_modules",
  "maplibre-gl",
  "dist",
  "maplibre-gl-worker.mjs",
);
const mapLibreSharedSource = resolve(
  webRoot,
  "node_modules",
  "maplibre-gl",
  "dist",
  "maplibre-gl-shared.mjs",
);
const publicMapLibreWorker = resolve(webRoot, "public", "maplibre-gl-worker.js");
const publicMapLibreShared = resolve(webRoot, "public", "maplibre-gl-shared.js");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (await exists(repositoryData)) {
  await rm(publicData, { recursive: true, force: true });
  await mkdir(publicData, { recursive: true });

  for (const entry of [
    "datasets",
    "search-index.json",
    "topics",
    "views",
  ]) {
    await cp(resolve(repositoryData, entry), resolve(publicData, entry), {
      recursive: true,
    });
  }

  console.log("Synchronized generated portal data.");
} else if (!(await exists(resolve(publicData, "views", "index.json")))) {
  throw new Error(
    "Generated portal data is unavailable. Run tools/build_portal.py first.",
  );
}

if (!(await exists(mapLibreWorkerSource)) || !(await exists(mapLibreSharedSource))) {
  throw new Error("MapLibre worker is unavailable. Run pnpm install first.");
}

const workerSource = (await readFile(mapLibreWorkerSource, "utf8"))
  .replace("./maplibre-gl-shared.mjs", "./maplibre-gl-shared.js")
  .replace(/\n\/\/# sourceMappingURL=.*$/u, "");
const sharedSource = (await readFile(mapLibreSharedSource, "utf8")).replace(
  /\n\/\/# sourceMappingURL=.*$/u,
  "",
);

await writeFile(publicMapLibreWorker, workerSource);
await writeFile(publicMapLibreShared, sharedSource);
console.log("Synchronized MapLibre worker assets.");
