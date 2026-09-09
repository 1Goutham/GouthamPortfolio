import type { Metadata, Viewport } from "next";
import { Montserrat, Anonymous_Pro, Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next";
import SmoothScroll from "./components/layout/smooth-scroll";

import "./globals.css";

// Only the fonts the UI actually uses are loaded (Geist was never referenced).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const anonymousPro = Anonymous_Pro({
  variable: "--font-anonymous-pro",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Goutham G",
  description: "Crafting sleek, modern web apps with style and skill.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${anonymousPro.variable} ${outfit.variable} antialiased`}
      >
        <SmoothScroll />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#1f1f1f",
              color: "#fff",
              border: "1px solid #333",
            },
          }}
        />

        {children}
        <Analytics />
      </body>
    </html>
  );
}
