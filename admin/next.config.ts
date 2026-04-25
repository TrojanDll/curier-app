import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    turbopack: {
        // Pin the workspace root so Turbopack does not pick up an unrelated
        // lockfile higher up in the filesystem.
        root: path.resolve(__dirname),
    },
};

export default nextConfig;
