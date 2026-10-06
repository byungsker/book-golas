import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/_app/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  transpilePackages: ["@bookgolas/supabase", "@bookgolas/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      { protocol: "https", hostname: "image.aladin.co.kr" },
    ],
  },
};

export default withNextIntl(nextConfig);
