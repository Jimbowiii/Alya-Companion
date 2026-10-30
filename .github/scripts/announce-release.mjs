import fs from "node:fs";

const repo = process.env.GITHUB_REPOSITORY;
const tag = process.env.GITHUB_REF_NAME;
const token = process.env.GITHUB_TOKEN;
const webhook = process.env.DISCORD_WEBHOOK_URL;

if (!repo || !tag || !webhook) {
  throw new Error("GITHUB_REPOSITORY, GITHUB_REF_NAME ou DISCORD_WEBHOOK_URL manquant.");
}

const headers = {
  "Accept": "application/vnd.github+json",
  "User-Agent": "ALYA-Companion-Release-Bot",
};
if (token) headers.Authorization = `Bearer ${token}`;

const api = `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`;

let release;
for (let attempt = 0; attempt < 12; attempt++) {
  const discordThreadId = process.env.DISCORD_THREAD_ID;
if (!discordThreadId) {
  throw new Error("Secret DISCORD_THREAD_ID manquant.");
}

const discordWebhookUrl = new URL(api);
discordWebhookUrl.searchParams.set("thread_id", discordThreadId);

const response = await fetch(discordWebhookUrl.toString(), { headers });
  if (!response.ok) throw new Error(`GitHub release API ${response.status}: ${await response.text()}`);
  release = await response.json();

  const hasWindows = release.assets?.some((a) => /\.(exe|msi)$/i.test(a.name));
  const hasAndroid = release.assets?.some((a) => /\.apk$/i.test(a.name));
  if (hasWindows && hasAndroid) break;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

const assets = Array.isArray(release.assets) ? release.assets : [];
const windows = assets.find((a) => /\.exe$/i.test(a.name)) || assets.find((a) => /\.msi$/i.test(a.name));
const android = assets.find((a) => /\.apk$/i.test(a.name));
const releaseUrl = release.html_url || `https://github.com/${repo}/releases/tag/${tag}`;

const version = tag.replace(/^v/, "");
let changelog = "";
try {
  const raw = fs.readFileSync("CHANGELOG.md", "utf8");
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = raw.match(new RegExp(`##\\s*\\[${escaped}\\][\\s\\S]*?(?=\\n##\\s*\\[|$)`));
  changelog = m ? m[0].replace(/^##[^\n]*\n?/, "").trim() : "";
} catch {}

const maxDescription = 3300;
let description = changelog || "Nouvelle version disponible.";
if (description.length > maxDescription) {
  description = description.slice(0, maxDescription - 90).trimEnd() +
    `\n\n… **Changelog tronqué sur Discord.** Consulte la GitHub Release pour la suite.`;
}

const fields = [];
if (windows) {
  fields.push({
    name: "📥 Windows",
    value: `[Télécharger ALYA Companion](${windows.browser_download_url})`,
    inline: true,
  });
}
if (android) {
  fields.push({
    name: "📱 Android APK",
    value: `[Télécharger l'APK](${android.browser_download_url})`,
    inline: true,
  });
}
fields.push({
  name: "🔗 GitHub Release",
  value: `[Voir la release complète](${releaseUrl})`,
  inline: true,
});

const payload = {
  username: "ALYA Companion",
  embeds: [{
    title: `ALYA Companion ${version}`,
    url: releaseUrl,
    description,
    fields,
    footer: { text: "ALYA Companion • PokeMMO Companion" },
    timestamp: new Date().toISOString(),
  }],
};

const res = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(`Discord webhook ${res.status}: ${await res.text()}`);

console.log(`[OK] Discord annoncé: Windows=${Boolean(windows)} Android=${Boolean(android)}`);
