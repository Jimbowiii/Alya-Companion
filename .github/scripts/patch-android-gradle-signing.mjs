import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.env.GITHUB_WORKSPACE || ".");
const file = path.join(root, "mobile", "src-tauri", "gen", "android", "app", "build.gradle.kts");

if (!fs.existsSync(file)) {
  throw new Error(`build.gradle.kts introuvable: ${file}. Lance tauri android init avant ce script.`);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (!s.includes("import java.io.FileInputStream")) {
  s = "import java.io.FileInputStream\n" + s;
}
if (!s.includes("import java.util.Properties")) {
  s = "import java.util.Properties\n" + s;
}

if (!/signingConfigs\s*\{[\s\S]*?create\(["']release["']\)/m.test(s)) {
  const idx = s.search(/\bbuildTypes\s*\{/);
  if (idx < 0) throw new Error("Bloc buildTypes introuvable dans app/build.gradle.kts.");

  const block = `signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }

    `;

  s = s.slice(0, idx) + block + s.slice(idx);
}

if (!/signingConfig\s*=\s*signingConfigs\.getByName\(["']release["']\)/.test(s)) {
  let replaced = false;

  s = s.replace(/getByName\(["']release["']\)\s*\{/, (m) => {
    replaced = true;
    return m + '\n            signingConfig = signingConfigs.getByName("release")';
  });

  if (!replaced) {
    s = s.replace(/\brelease\s*\{/, (m) => {
      replaced = true;
      return m + '\n            signingConfig = signingConfigs.getByName("release")';
    });
  }

  if (!replaced) throw new Error("Bloc release introuvable dans buildTypes.");
}

fs.writeFileSync(file, s.replace(/\n/g, "\r\n"), "utf8");
console.log("[OK] Android build.gradle.kts patche pour la signature release.");
