import type { NextConfig } from "next";
const path = require('path')

const withSerwist = require("@serwist/next").default({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.BUILD_TARGET === 'static' ? 'export' : undefined,
  images: {
    unoptimized: process.env.BUILD_TARGET === 'static',
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default withSerwist(nextConfig);
