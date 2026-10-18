import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const routes = new Map([
  ["/", ["public/index.html", "text/html; charset=utf-8"]],
  ["/app.mjs", ["public/app.mjs", "text/javascript; charset=utf-8"]],
  ["/style.css", ["public/style.css", "text/css; charset=utf-8"]],
  ["/icon.svg", ["public/icon.svg", "image/svg+xml"]],
  ["/engine.mjs", ["src/engine.mjs", "text/javascript; charset=utf-8"]],
]);

export function createLabServer() {
  return createServer(async (request, response) => {
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    const route = routes.get(request.url);
    if (!route) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    try {
      const content = await readFile(new URL(route[0], import.meta.url));
      response.writeHead(200, {
        "Content-Type": route[1],
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      response.writeHead(500);
      response.end("Unable to load demo");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createLabServer();
  const port = Number(process.env.LAB_PORT || 4173);
  server.listen(port, "127.0.0.1", () =>
    console.log(`Operational Flow Lab: http://127.0.0.1:${port}`),
  );
}
