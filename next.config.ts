import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開発中の印（左下の「N」）は、iPhone の画面の見た目を確かめるときにじゃまになるので出さない
  devIndicators: false,
  async headers() {
    return [
      {
        // 画面の部品を控える仕組みは、いつも最新を読ませる
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
