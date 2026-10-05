// Builds the planner (public/app/index.html) from the separate page files in src/app.
// Run locally with:  npm run build   (Netlify runs it automatically on every push)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "src", "app");
const read = p => readFileSync(join(app, p), "utf8");
const cfg = JSON.parse(read("build.json"));
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version.replace(/\.0$/, "");

let html = read("index.template.html");
html = html.replace(/<!-- @include (.+?) -->/g, (_, p) => read(p.trim()).replace(/\n$/, ""));
const css = cfg.css.map(read).join("\n").replace(/\n$/, "");
html = html.replace("/* @css */", () => css);
const js = cfg.js.map(read).join("");
html = html.replace("/* @js */", () => js.replace(/\n$/, ""));

html = html.replace(/\{\{VERSION\}\}/g, version);

const out = join(root, "public", "app", "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Built version ${version}: public/app/index.html from ${cfg.js.length} script files and ${html.match(/<!-- @include/g) ? "unresolved includes!" : "all page files"} (${Math.round(html.length / 1024)} KB)`);
