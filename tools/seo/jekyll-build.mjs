import { spawnSync } from "node:child_process";
import path from "node:path";
const image =
  "ghcr.io/actions/jekyll-build-pages@sha256:6791ebfd912185ed59bfb5fb102664fa872496b79f87ff8b9cfba292a7345041";
// Docker runs Jekyll locally. This never invokes GitHub Actions or publishes.
const args = [
  "run",
  "--rm",
  "--entrypoint",
  "/bin/sh",
  "-v",
  `${path.resolve(".")}:/site`,
  "-w",
  "/site",
  image,
  "-c",
  "bundle check && bundle exec jekyll build --safe --source /site --destination /site/.private/seo-jekyll && chmod -R a+rX /site/.private/seo-jekyll",
];
const result = spawnSync("docker", args, { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
