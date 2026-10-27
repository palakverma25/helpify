import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Every screen depends on the officer session and the live queue.
  outputFileTracingIncludes: {
    "/**": [
      "./prisma/build.db",
      "./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
