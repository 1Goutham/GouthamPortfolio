import type { Metadata, Viewport } from "next";
import { Anonymous_Pro, Outfit, Noto_Sans_Tamil, Playfair_Display, Nothing_You_Could_Do, Montserrat, Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next";
import SmoothScroll from "./components/layout/smooth-scroll";
import SiteAgent from "./components/agent/site-agent";

import { SITE_URL, pageMeta } from "@/lib/seo";
import "./globals.css";

// Only the fonts the UI actually uses are loaded.
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

// Used for the Thirukkural in the hero; Outfit has no Tamil glyphs.
const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400"],
  display: "swap",
});

// The "'til death, we do art." line on the Margin teaser.
const playfair = Playfair_Display({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
});

// Handwritten "1G-works" wordmark. The design uses Figma's Freehand, which
// has no web version; this is the closest match on Google Fonts.
const hand = Nothing_You_Could_Do({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// The contact section's copy and its button. Far down the page, so not
// preloaded.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  preload: false,
});
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMeta({
    title: "Goutham G | AI Product Engineer & Designer",
    description:
      "Goutham G (Goutham Gopinath) is an AI product engineer and designer in Coimbatore, India, building digital products with AI, code and design: full-stack web apps, AI tools and the 1G-works studio.",
    path: "/",
    image: "home",
    alt: "Goutham G, AI Product Engineer & Designer: I build digital products with AI, code & design",
  }),
  applicationName: "Goutham G",
  authors: [{ name: "Goutham G", url: SITE_URL }],
  creator: "Goutham G",
  publisher: "Goutham G",
  keywords: [
    "Goutham G",
    "Goutham Gopinath",
    "AI product engineer",
    "AI engineer",
    "full stack developer",
    "product designer",
    "UI/UX designer",
    "Next.js developer",
    "Coimbatore",
    "India",
    "portfolio",
    "1G-works",
  ],
  category: "technology",
  formatDetection: { email: false, telephone: false, address: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
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
        className={`${anonymousPro.variable} ${outfit.variable} ${notoSansTamil.variable} ${playfair.variable} ${hand.variable} ${montserrat.variable} ${poppins.variable} antialiased`}
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
        {/* Sticky on every page; it lives here so it survives navigation. */}
        <SiteAgent />
        <Analytics />
      </body>
    </html>
  );
}
