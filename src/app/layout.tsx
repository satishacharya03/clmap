import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6"
};

export const metadata: Metadata = {
  title: "CampusNav - Smart Campus Navigation",
  description: "Smart Campus Navigation and Information Platform - Find your way around campus easily",
  keywords: [
    "campus", "navigation", "map", "university", "college", "places", "directions",
    "detect navigation", "cu map", "cu navigation", "chandigrah map", "chandigarh map",
    "cu campus map", "cu campus navigation", "chandigarh university map"
  ],
  authors: [{ name: "CampusNav Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CampusNav"
  },
  verification: {
    google: "GPcAMvoJqIiDxD5OD-H1As13QpgXIFrcuy0sChrji6Y"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPWAInstallPrompt = e;
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch((err) => {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
