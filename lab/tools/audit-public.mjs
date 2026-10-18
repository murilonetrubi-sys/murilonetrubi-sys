import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = new URL("../../", import.meta.url);
const skip = new Set([".git", "node_modules", ".capture-video"]);
const textExtensions = /\.(?:md|mjs|json|css|html|svg|yml|yaml)$/i;
let checked = 0;
const failures = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = new URL(
      entry.name + (entry.isDirectory() ? "/" : ""),
      directory,
    );
    if (entry.isSymbolicLink()) {
      failures.push("Symlink is not allowed in the public bundle");
      continue;
    }
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (
      /^\.env(?:\.|$)|\.(?:pem|key|p12|pfx|sql|sqlite|db|log)$/i.test(
        entry.name,
      )
    )
      failures.push("Operational file found");
    if (!textExtensions.test(entry.name)) continue;
    const text = await readFile(path, "utf8");
    checked++;
    if (
      /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:ghp|github_pat|sk_live)_[a-zA-Z0-9]{12,}/.test(
        text,
      )
    )
      failures.push("Credential-like content found");
    if (
      text
        .match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)
        ?.some((ip) => ip !== "127.0.0.1")
    )
      failures.push("Non-loopback address found");
    if (/\b55\d{11}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(text))
      failures.push("Personal identifier pattern found");
    const browserText = text
      .replaceAll("http://www.w3.org/2000/svg", "")
      .replaceAll(
        "https://github.com/murilonetrubi-sys/murilonetrubi-sys/blob/main/portfolio/",
        "",
      );
    if (
      (path.pathname.includes("/lab/public/") ||
        /\/showcase\/(?:app\.mjs|style\.css)$/.test(path.pathname)) &&
      /https?:\/\/|fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie/.test(
        browserText,
      )
    )
      failures.push("External or persistent browser capability found");
  }
}
await visit(root);
assert.deepEqual(failures, []);
const html = await readFile(new URL("lab/public/index.html", root), "utf8");
assert.match(html, /DEMONSTRAÇÃO SINTÉTICA/);
for (const path of [
  "README.md",
  "portfolio/README.md",
  "portfolio/maxisystem.md",
  "portfolio/facilitasystem.md",
  "portfolio/decorsystem.md",
  "portfolio/mrl-auth.md",
  "portfolio/logos.md",
  "portfolio/bella-ia.md",
  "showcase/README.md",
]) {
  const text = await readFile(new URL(path, root), "utf8");
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|mailto:|#)/.test(match[1])) continue;
    const target = new URL(match[1].split("#")[0], new URL(path, root));
    assert.ok(fileURLToPath(target).startsWith(fileURLToPath(root)));
    await readdir(target).catch(async (error) => {
      if (error.code === "ENOTDIR") await readFile(target);
      else throw error;
    });
  }
}
console.log(
  `Public bundle audit: ${checked} text files checked; local links and sensitive-pattern checks passed. Manual content and image review is also required.`,
);
