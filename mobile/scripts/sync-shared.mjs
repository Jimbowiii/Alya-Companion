import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const target = path.join(mobileRoot, "src", "shared");

await rm(target, { recursive: true, force: true });
await mkdir(path.join(target, "assets", "surf-previews"), { recursive: true });

const files = [
  "auth.ts",
  "useAlyaAuth.ts",
  "AuthGate.tsx",
  "types.ts",
  "DashboardEvent.tsx",
  "gymRerunData.ts",
  "raidsData.ts",
];

for (const file of files) {
  const source = path.join(projectRoot, "src", file);
  try {
    await stat(source);
  } catch {
    throw new Error(`Fichier partage introuvable: src/${file}`);
  }
  await cp(source, path.join(target, file));
}

const icon = path.join(projectRoot, "src", "assets", "alya-icon.png");
await cp(icon, path.join(target, "assets", "alya-icon.png"));

const previewsSource = path.join(projectRoot, "src", "assets", "surf-previews");
try {
  await stat(previewsSource);
  await cp(previewsSource, path.join(target, "assets", "surf-previews"), { recursive: true });
} catch {
  console.warn("[ALYA Mobile] surf-previews introuvable; Surf Manager affichera les cartes sans image.");
}


// Android deep links are registered statically in tauri.conf.json.
// The desktop auth module also attempts runtime registration for Windows dev;
// remove that expected-to-fail block in the mobile copy so it never surfaces
// as a login error.
const mobileAuthPath = path.join(target, "auth.ts");
let mobileAuth = await (await import("node:fs/promises")).readFile(mobileAuthPath, "utf8");
mobileAuth = mobileAuth.replace(
  /\n  try \{\n    await register\("alya-companion"\);\n  \} catch \(error\) \{\n    onError\?\.\(error\);\n  \}\n/,
  '\n  // Android: scheme alya-companion is registered statically by Tauri.\n',
);
await (await import("node:fs/promises")).writeFile(mobileAuthPath, mobileAuth, "utf8");


// Surf Manager Android uses the exact same xdelta resources as Windows.
const surfResourcesSource = path.join(projectRoot, "src-tauri", "resources", "surf");
const surfResourcesTarget = path.join(mobileRoot, "src-tauri", "resources", "surf");
try {
  await stat(path.join(surfResourcesSource, "patches.json"));
  await rm(surfResourcesTarget, { recursive: true, force: true });
  await mkdir(path.dirname(surfResourcesTarget), { recursive: true });
  await cp(surfResourcesSource, surfResourcesTarget, { recursive: true });
} catch {
  throw new Error("Ressources Surf introuvables: src-tauri/resources/surf (patches.json + .xdelta requis).");
}

console.log("[ALYA Mobile] Sources partagees synchronisees.");
