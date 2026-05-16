import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @tripcraft/shared is a workspace package shipped as TS source —
  // Next must transpile it rather than treat it as pre-built.
  transpilePackages: ["@tripcraft/shared"],
};

export default nextConfig;
