import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
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
