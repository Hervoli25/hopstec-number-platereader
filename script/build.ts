import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server (standalone)...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: allDeps.filter(dep => !["drizzle-orm", "drizzle-zod", "express", "express-session", "passport", "passport-local", "pg", "bcryptjs", "dotenv", "memorystore", "connect-pg-simple", "zod", "zod-validation-error", "memoizee", "date-fns", "ws"].includes(dep)),
    logLevel: "info",
  });

  // Build Vercel serverless function - FULLY BUNDLED
  console.log("building Vercel API function...");
  await mkdir("api", { recursive: true });

  await esbuild({
    entryPoints: ["api/_entry.js"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/server.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    // Bundle everything except native Node modules
    external: [],
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
