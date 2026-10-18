import assert from "node:assert/strict";
import { mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createLabServer } from "../server.mjs";

const capture = process.argv.includes("--capture");
const assets = fileURLToPath(new URL("../../assets/", import.meta.url));
const temporaryVideo = fileURLToPath(
  new URL("../../.capture-video/", import.meta.url),
);
const server = createLabServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const errors = [];
const outsideRequests = [];
const pause = async (page) => {
  if (capture) await page.waitForTimeout(1250);
};
let video;
try {
  if (capture) await mkdir(assets, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 1000 },
    reducedMotion: "reduce",
    ...(capture
      ? {
          recordVideo: {
            dir: temporaryVideo,
            size: { width: 1360, height: 1000 },
          },
        }
      : {}),
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin)
      outsideRequests.push(request.url());
  });
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "Uma reserva. Um efeito." })
    .waitFor();
  assert.equal(await page.locator("#available").textContent(), "24");
  if (capture)
    await page.screenshot({
      path: `${assets}/lab-overview.jpg`,
      type: "jpeg",
      quality: 83,
    });
  await pause(page);
  await page
    .getByRole("button", { name: "Reservar unidades", exact: true })
    .click();
  assert.equal(await page.locator("#available").textContent(), "18");
  await pause(page);
  await page.getByRole("button", { name: "Repetir mesma operação" }).click();
  assert.equal(await page.locator("#available").textContent(), "18");
  assert.match(
    await page.getByRole("status").textContent(),
    /Repetição reconhecida/,
  );
  await pause(page);
  await page.locator("#quantity").fill("30");
  await page
    .getByRole("button", { name: "Reservar unidades", exact: true })
    .click();
  assert.match(
    await page.getByRole("status").textContent(),
    /Quantidade indisponível/,
  );
  await pause(page);
  await page.locator('[data-view="context"]').click();
  await page
    .getByRole("button", { name: "Unidade Horizonte", exact: true })
    .click();
  await page.getByRole("button", { name: "Responder “obrigado”" }).click();
  assert.match(
    await page.locator(".state-list").textContent(),
    /Unidade Horizonte/,
  );
  assert.match(
    await page.getByRole("status").textContent(),
    /contexto.*preservado/,
  );
  if (capture)
    await page.screenshot({
      path: `${assets}/lab-context.jpg`,
      type: "jpeg",
      quality: 83,
    });
  await pause(page);
  await page.locator('[data-view="review"]').click();
  await page
    .getByRole("button", { name: "Pedido Aurora", exact: true })
    .click();
  await page.getByRole("button", { name: "Simular relato de avaria" }).click();
  await pause(page);
  await page.getByRole("button", { name: "Responder “obrigado”" }).click();
  assert.match(
    await page.getByRole("status").textContent(),
    /continua aguardando revisão humana/,
  );
  if (capture)
    await page.screenshot({
      path: `${assets}/lab-review.jpg`,
      type: "jpeg",
      quality: 83,
    });
  await pause(page);
  await page.locator('[data-view="access"]').click();
  await page
    .getByRole("button", { name: "Simular revisão de ocorrência" })
    .click();
  assert.match(
    await page.getByRole("status").textContent(),
    /Permissão não concedida/,
  );
  if (capture)
    await page.screenshot({
      path: `${assets}/lab-access.jpg`,
      type: "jpeg",
      quality: 83,
    });
  await pause(page);
  await page.getByRole("button", { name: "Gestor", exact: true }).click();
  await page
    .getByRole("button", { name: "Simular revisão de ocorrência" })
    .click();
  assert.match(
    await page.getByRole("status").textContent(),
    /Permissão explícita encontrada/,
  );
  await pause(page);
  if (capture) video = page.video();
  await context.close();
  if (video) {
    await rename(await video.path(), `${assets}/lab-walkthrough.webm`);
  }
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (error) => errors.push(error.message));
  mobile.on("request", (request) => {
    if (new URL(request.url()).origin !== origin)
      outsideRequests.push(request.url());
  });
  await mobile.goto(origin);
  for (const name of ["inventory", "context", "review", "access"]) {
    await mobile.locator(`[data-view="${name}"]`).click();
    assert.equal(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      `Overflow on mobile: ${name}`,
    );
  }
  await mobile.locator('[data-view="inventory"]').click();
  if (capture)
    await mobile.screenshot({
      path: `${assets}/lab-mobile.jpg`,
      type: "jpeg",
      quality: 83,
      fullPage: true,
    });
  assert.deepEqual(errors, []);
  assert.deepEqual(outsideRequests, []);
  console.log(
    "Browser checks: desktop + mobile; inventory replay, context, review, permissions; zero page errors and zero external requests.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
