import { access, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const repositoryData = resolve(webRoot, "..", "generated");
const publicData = resolve(webRoot, "public", "data");

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
    "areas.json",
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
