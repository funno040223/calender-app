import type { MetadataRoute } from "next";

// ホーム画面に追加したときの名前・アイコン・開き方
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "リズム カレンダー",
    short_name: "リズム",
    description: "予定に合わせて、タスクと生活のリズムを自動で組み立てるカレンダー",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
