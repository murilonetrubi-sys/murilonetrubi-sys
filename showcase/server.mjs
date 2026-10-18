import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const routes = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]],
  ["/lab/public/icon.svg", ["../lab/public/icon.svg", "image/svg+xml"]],
]);
for (const slug of [
  "maxisystem",
  "facilitasystem",
  "decorsystem",
  "mrl-auth",
  "logos",
  "bella-ia",
]) {
  routes.set(`/assets/${slug}-case.svg`, [
    `../assets/${slug}-case.svg`,
    "image/svg+xml",
  ]);
}

export function createShowcaseServer() {
  return createServer(async (request, response) => {
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      return response.end();
    }
    const asset = routes.get(request.url);
    if (!asset) {
      response.writeHead(404);
      return response.end("Not found");
    }
    try {
      const content = await readFile(new URL(asset[0], import.meta.url));
      response.writeHead(200, {
        "Content-Type": asset[1],
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      response.writeHead(500);
      response.end("Unable to load portfolio");
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORTFOLIO_PORT || 4181);
  createShowcaseServer().listen(port, "127.0.0.1", () =>
    console.log(`Portfolio: http://127.0.0.1:${port}`),
  );
}
