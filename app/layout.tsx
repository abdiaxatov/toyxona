import type React from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/components/cart-provider";
import { Analytics } from "@vercel/analytics/next";
import CustomScroll from "@/components/custom-scroll";
import SmoothScroll from "@/components/smooth-scroll";
import PWAInstallPrompt from "@/components/pwa-install";

import { LanguageProvider } from "@/hooks/use-language";
import Script from "next/script";
import "./globals.css";

// Leaflet CSS CDN
const leafletCss = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const leafletJs = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Menyu",
  description: "Zamonaviy restoran ovqat buyurtma tizimi",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png" },
    ],
    shortcut: ["/icon-192.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={leafletCss} />
        {/* Fix for ChunkLoadError (Loading chunk failed) — common in Next.js when new deployments occur */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (event) => {
                const msg = event.message || '';
                if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk') || msg.includes('next/static/chunks')) {
                  console.warn('Chunk load error detected, reloading...', msg);
                  window.location.reload();
                }
              }, true);
              
              window.addEventListener('unhandledrejection', (event) => {
                const reason = event.reason || {};
                const msg = typeof reason === 'string' ? reason : (reason.message || reason.name || '');
                if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) {
                  console.warn('Unhandled chunk rejection, reloading...', msg);
                  window.location.reload();
                }
              });
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <LanguageProvider>
            <CartProvider>
              <SmoothScroll>
                <CustomScroll />
                <Suspense fallback={null}>
                  {children}
                </Suspense>
                <Analytics />
              </SmoothScroll>
              <PWAInstallPrompt />
              <Toaster />
              <SonnerToaster position="top-center" richColors />
            </CartProvider>
          </LanguageProvider>
        </ThemeProvider>
        {/* Telegram WebApp SDK — beforeInteractive: must load BEFORE React so initDataUnsafe is available */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src={leafletJs}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
