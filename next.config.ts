import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ezeket a csomagokat a Next.js NE próbálja meg bundleolni –
  // natív Node.js modulokként kell futniuk a Serverless Functionben.
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium-min",
    "puppeteer",     // ha helyi devDependencyként marad
  ],
};

export default nextConfig;
