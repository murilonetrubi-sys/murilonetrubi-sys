import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const root = new URL("../../", import.meta.url);
const slugs = [
  "maxisystem",
  "facilitasystem",
  "decorsystem",
  "mrl-auth",
  "logos",
  "bella-ia",
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const capture = process.argv.indexOf("--capture");
const destination = capture >= 0 ? process.argv[capture + 1] : null;
if (destination) await mkdir(destination, { recursive: true });
try {
  for (const slug of slugs) {
    const asset = `${slug}-case.svg`;
    const svg = await readFile(new URL(`assets/${asset}`, root), "utf8");
    for (const width of [1200, 390]) {
      await page.setViewportSize({ width, height: width === 1200 ? 600 : 260 });
      await page.setContent(
        `<html lang="pt-BR"><head><meta charset="utf-8"><style>body{margin:0}svg{display:block;width:100%;height:auto}</style></head><body>${svg}</body></html>`,
      );
      const issues = await page.evaluate(() => {
        const outside = [...document.querySelectorAll("text")]
          .filter((text) => {
            const box = text.getBoundingClientRect();
            return (
              box.left < 0 ||
              box.right > innerWidth + 1 ||
              box.top < 0 ||
              box.bottom >
                document.querySelector("svg").getBoundingClientRect().bottom + 1
            );
          })
          .map((text) => text.textContent);
        return {
          outside,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.deepEqual(
        issues,
        { outside: [], overflow: false },
        `${slug} at ${width}px`,
      );
      if (destination)
        await page.screenshot({
          path: `${destination}/${slug}-${width}.png`,
          fullPage: true,
        });
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "Portfolio: six distinct case illustrations; desktop and mobile; no clipped text, horizontal overflow or browser errors.",
  );
} finally {
  await browser.close();
}
