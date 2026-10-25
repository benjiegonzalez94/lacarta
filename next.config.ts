import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack(config) {
    const oneOfRule = config.module.rules.find(
      (rule: { oneOf?: unknown[] }) => Array.isArray(rule?.oneOf)
    );
    if (oneOfRule && Array.isArray(oneOfRule.oneOf)) {
      for (const subRule of oneOfRule.oneOf) {
        if (
          Array.isArray(subRule.use) &&
          subRule.use.some(
            (loader: { loader?: string }) =>
              typeof loader?.loader === "string" &&
              loader.loader.includes("css-loader")
          )
        ) {
          subRule.use.push({
            loader: "@tailwindcss/turbopack",
          });
        }
      }
    }
    return config;
  },
};

export default nextConfig;
