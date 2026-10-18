import test from "node:test";
import assert from "node:assert/strict";
import { createLabServer } from "../server.mjs";

test("servidor entrega somente assets permitidos, sem endpoints de escrita", async () => {
  const server = createLabServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.ok(
      page.headers
        .get("content-security-policy")
        .includes("connect-src 'none'"),
    );
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");
    assert.match(await page.text(), /DEMONSTRAÇÃO SINTÉTICA/);
    for (const path of ["/app.mjs", "/style.css", "/engine.mjs"])
      assert.equal((await fetch(base + path)).status, 200);
    for (const path of [
      "/README.md",
      "/package.json",
      "/.git/config",
      "/api/send",
      "/%2e%2e/README.md",
    ])
      assert.equal((await fetch(base + path)).status, 404);
    assert.equal(
      (await fetch(base, { method: "POST", body: "test" })).status,
      405,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
