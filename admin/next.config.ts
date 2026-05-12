import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    turbopack: {
        // Pin the workspace root so Turbopack does not pick up an unrelated
        // lockfile higher up in the filesystem.
        root: path.resolve(__dirname),
    },
    // Standalone build emits .next/standalone/ with a self-contained server.js
    // and only the production deps it actually traced — that is what the
    // production Docker image runs (§14.5.2 / §11). Local `next dev` is
    // unaffected; this only kicks in on `next build`.
    output: "standalone",
};

export default nextConfig;
