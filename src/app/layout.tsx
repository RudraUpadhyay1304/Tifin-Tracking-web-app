import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomNav } from "@/components/BottomNav";
import { dict } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Tiffin Manager",
  description:
    "Smart tiffin business manager — customers, calendar, payments, menu and AI assistant.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tiffin Manager",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-icon-180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const store = await cookies();
  const lang = store.get("lang")?.value === "hi" ? "hi" : "en";
  const theme = store.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang={lang} className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-dvh flex flex-col">
        <Providers />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
          {children}
        </main>
        <BottomNav t={dict[lang]} />
      </body>
    </html>
  );
}
