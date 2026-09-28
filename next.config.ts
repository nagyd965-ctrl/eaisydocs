import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Ezeket a csomagokat a Next.js NE próbálja meg bundleolni –
  // natív Node.js modulokként kell futniuk a Serverless Functionben.
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium-min",
    "puppeteer",
    "pdfjs-dist",   // Vercel: ne bundleoljon, Node.js módként fusson
    "pdf-parse",    // Vercel: eval()-t tartalmaz, ne bundleoljon
  ],
};

export default nextConfig;
