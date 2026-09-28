import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorker from "@/components/app/ServiceWorker";

export const metadata: Metadata = {
  title: "リズム カレンダー",
  description: "予定に合わせて、タスクと生活のリズムを自動で組み立てるカレンダー",
  // iPhone でホーム画面に追加したとき、Safari の枠なしで開く
  appleWebApp: { capable: true, title: "リズム", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
