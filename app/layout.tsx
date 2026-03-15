import type { Metadata } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/components/shared/pwa-registrar";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "إدارة استلام وتسليم الأموال بين العمال مع دعم العمل بدون إنترنت",
  manifest: "/manifest.json"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
