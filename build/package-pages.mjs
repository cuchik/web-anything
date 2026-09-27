import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const client = new URL("dist/client/", root);
const server = new URL("dist/server/", root);
const output = new URL("dist/pages/", root);

// Fail before removing an older package if the Vinext build is incomplete.
await access(new URL("index.js", server));
await access(client);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(client, output, {
  recursive: true,
  filter: (source) => !source.endsWith("/.vite") && !source.endsWith(".map"),
});

// Pages Advanced Mode accepts an ES-module directory named _worker.js.
// Keep the SSR chunks beside index.js so dynamic imports retain their paths.
// Server code stays inside this private directory, never among public assets.
await cp(server, new URL("_worker.js/", output), {
  recursive: true,
  filter: (source) => !source.endsWith("/wrangler.json") && !source.endsWith(".map"),
});

// Vite's hashed assets bypass SSR. Other requests (including public files)
// use the existing handler, which forwards public files to env.ASSETS.
await writeFile(new URL("_routes.json", output), JSON.stringify({
  version: 1,
  include: ["/*"],
  exclude: ["/assets/*"],
}, null, 2) + "\n");

// The Vite plugin writes a Workers deploy redirect. Pages must instead read
// the root Pages configuration, including its production D1 binding.
await rm(new URL(".wrangler/deploy/config.json", root), { force: true });
process.stdout.write(`Pages output: ${fileURLToPath(output)}\n`);
