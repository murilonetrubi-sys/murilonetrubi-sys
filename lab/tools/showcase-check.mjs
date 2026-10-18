import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createShowcaseServer } from "../../showcase/server.mjs";

const server = createShowcaseServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const capture = process.argv.includes("--capture");
const assets = fileURLToPath(new URL("../../assets/", import.meta.url));
const browser = await chromium.launch({ headless: true });
const errors = [];
const external = [];
try {
  if (capture) await mkdir(assets, { recursive: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin) external.push(request.url());
  });
  for (const [width, height] of [
    [1440, 1000],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".project:visible").count(), 6);
    for (const [filter, expected] of [
      ["industry", 3],
      ["telecom", 1],
      ["service", 2],
      ["all", 6],
    ]) {
      await page.locator(`[data-filter="${filter}"]`).click();
      assert.equal(await page.locator(".project:visible").count(), expected);
      assert.match(
        await page.getByRole("status").textContent(),
        new RegExp(`^${expected} projeto`),
      );
      assert.equal(
        await page.locator('.filters [aria-pressed="true"]').count(),
        1,
      );
    }
    for (const slug of [
      "maxisystem",
      "facilitasystem",
      "decorsystem",
      "mrl-auth",
      "logos",
      "bella-ia",
    ]) {
      const button = page.locator(`#${slug} .detail-button`);
      await button.click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page.locator("#dialog-title").textContent(),
        await button.getAttribute("data-title"),
      );
      assert.ok(
        (await page.locator("#dialog-case").getAttribute("href")).endsWith(
          `${slug}.md`,
        ),
      );
      if (slug === "maxisystem")
        assert.match(
          await page.locator("#dialog-detail").textContent(),
          /indústria de móveis/,
        );
      if (["facilitasystem", "decorsystem"].includes(slug))
        assert.match(
          await page.locator("#dialog-detail").textContent(),
          /estofados/,
        );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(
        await button.evaluate((element) => element === document.activeElement),
        true,
      );
    }
    await page.locator('[data-filter="all"]').click();
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      images: [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.alt),
      anchors: [...document.querySelectorAll('a[href^="#"]')]
        .filter((link) => !document.getElementById(link.hash.slice(1)))
        .map((link) => link.hash),
    }));
    assert.deepEqual(
      layout,
      { overflow: false, images: [], anchors: [] },
      `layout at ${width}px`,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    if (capture && [1440, 390].includes(width)) {
      await page.screenshot({
        path: `${assets}/showcase-${width === 1440 ? "desktop" : "mobile"}.jpg`,
        type: "jpeg",
        quality: 90,
      });
      if (width === 1440)
        await page
          .locator(".project-grid")
          .screenshot({
            path: `${assets}/showcase-projects.jpg`,
            type: "jpeg",
            quality: 90,
          });
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Showcase: 320/390/768/1440px, six independent projects, filters, dialogs, Escape + focus, links, images, reduced motion; zero overflow, browser errors or external requests.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
