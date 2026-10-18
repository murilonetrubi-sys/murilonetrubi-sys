import test from "node:test";
import assert from "node:assert/strict";
import { createShowcaseServer } from "../../showcase/server.mjs";

test("vitrine serve somente recursos públicos e não aceita efeitos externos", async () => {
  const server = createShowcaseServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.match(
      page.headers.get("content-security-policy"),
      /connect-src 'none'/,
    );
    const html = await page.text();
    assert.match(html, /Negócio real/);
    assert.match(html, /não são capturas/i);
    for (const path of [
      "/style.css",
      "/app.mjs",
      "/assets/maxisystem-case.svg",
      "/assets/decorsystem-case.svg",
    ])
      assert.equal((await fetch(origin + path)).status, 200);
    for (const path of [
      "/README.md",
      "/.env",
      "/.git/config",
      "/api/send",
      "/assets/lab-overview.jpg",
    ])
      assert.equal((await fetch(origin + path)).status, 404);
    assert.equal((await fetch(origin, { method: "POST" })).status, 405);
    const head = await fetch(origin, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
