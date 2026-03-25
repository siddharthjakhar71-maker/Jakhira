import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, cp, writeFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

const WINDOWS_DIST = "windows-dist";

async function buildWindows() {
  console.log("=== Building Windows Standalone Package ===\n");

  console.log("[1/5] Cleaning output directory...");
  await rm(WINDOWS_DIST, { recursive: true, force: true });
  await mkdir(WINDOWS_DIST, { recursive: true });

  console.log("[2/5] Building frontend (Vite)...");
  await rm("dist", { recursive: true, force: true });
  await viteBuild();

  console.log("[3/5] Bundling server (esbuild)...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const bundledDeps = [
    "drizzle-orm",
    "drizzle-zod",
    "express",
    "express-session",
    "memorystore",
    "ws",
    "xlsx",
    "zod",
    "zod-validation-error",
    "date-fns",
  ];
  const externals = allDeps.filter((dep) => !bundledDeps.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(WINDOWS_DIST, "server.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: ["better-sqlite3"],
    logLevel: "info",
  });

  console.log("[4/5] Copying frontend assets...");
  await cp("dist/public", path.join(WINDOWS_DIST, "public"), { recursive: true });

  console.log("[5/5] Creating pkg executable...");
  const pkgConfig = {
    name: "billionaire-homes",
    version: "1.0.0",
    bin: "server.cjs",
    pkg: {
      targets: ["node18-win-x64"],
      assets: [],
      outputPath: ".",
    },
  };
  await writeFile(
    path.join(WINDOWS_DIST, "package.json"),
    JSON.stringify(pkgConfig, null, 2)
  );

  try {
    const { stdout, stderr } = await execAsync(
      `npx @yao-pkg/pkg ${path.join(WINDOWS_DIST, "server.cjs")} --targets node18-win-x64 --output ${path.join(WINDOWS_DIST, "BillionaireHomes.exe")}`,
      { timeout: 120000 }
    );
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (err: any) {
    console.error("pkg build error:", err.message);
    console.log("\nNote: The server bundle was created successfully at windows-dist/server.cjs");
    console.log("You can run pkg manually on a Windows machine if cross-compilation fails.");
  }

  await writeFile(
    path.join(WINDOWS_DIST, "start.bat"),
    `@echo off\r\ntitle Billionaire Homes LLP - Purchase Department\r\necho Starting Billionaire Homes LLP Dashboard...\r\necho.\r\necho The application will open at: http://localhost:5000\r\necho Press Ctrl+C to stop the server.\r\necho.\r\nstart http://localhost:5000\r\nBillionaireHomes.exe\r\npause\r\n`
  );

  await writeFile(
    path.join(WINDOWS_DIST, "README.txt"),
    `Billionaire Homes LLP - Purchase Department Dashboard\r\n=====================================================\r\n\r\nOFFLINE STANDALONE APPLICATION\r\n\r\nThis application runs entirely on your computer.\r\nNo internet connection or Node.js installation required.\r\n\r\nFOLDER CONTENTS:\r\n  BillionaireHomes.exe  - Main application executable\r\n  start.bat             - Double-click to start (opens browser automatically)\r\n  public/               - Web interface files (do not modify)\r\n  data/                 - Database folder (created on first run)\r\n  better_sqlite3.node   - Database engine (required, do not remove)\r\n\r\nHOW TO RUN:\r\n  1. Double-click "start.bat" to launch the application\r\n  2. Your browser will open automatically at http://localhost:5000\r\n  3. Login with your credentials\r\n  4. To stop: close the command window or press Ctrl+C\r\n\r\nDATA STORAGE:\r\n  All your data is stored locally in the "data/" folder.\r\n  To backup your data, copy the entire "data/" folder.\r\n  To move to another computer, copy this entire folder.\r\n\r\nDEFAULT LOGIN:\r\n  Email: siddharthjakhar71@gmail.com\r\n  Password: 8800447427\r\n\r\nIMPORTANT:\r\n  - Do NOT delete the "public/" folder\r\n  - Do NOT delete "better_sqlite3.node"\r\n  - The "data/" folder contains all your saved data\r\n  - Port 5000 must be available on your computer\r\n`
  );

  console.log("\n=== Build Complete ===");
  console.log(`\nOutput: ${WINDOWS_DIST}/`);
  console.log("Contents:");
  console.log("  BillionaireHomes.exe  - Main executable");
  console.log("  start.bat             - Launcher (opens browser)");
  console.log("  public/               - Frontend assets");
  console.log("  README.txt            - Instructions");
  console.log("\nIMPORTANT: Before distributing, you must also include:");
  console.log("  better_sqlite3.node   - Windows native addon for SQLite");
  console.log("\nTo get the Windows better-sqlite3 native addon:");
  console.log("  1. On a Windows machine with Node.js installed, run:");
  console.log("     npm install better-sqlite3");
  console.log("  2. Copy node_modules/better-sqlite3/prebuilds/win32-x64/better_sqlite3.node");
  console.log("     into the windows-dist/ folder next to the .exe");
  console.log("  OR download from: https://github.com/WiseLibs/better-sqlite3/releases");
}

buildWindows().catch((err) => {
  console.error(err);
  process.exit(1);
});
