import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat, Anonymous_Pro, Outfit } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/next';


import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const anonymousPro = Anonymous_Pro({
  variable: "--font-anonymous-pro",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Goutham G",
  description: "Crafting sleek, modern web apps with style and skill.",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}  ${montserrat.variable} ${anonymousPro.variable} ${outfit.variable} antialiased`}
      >
         <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1f1f1f',
              color: '#fff',
              border: '1px solid #333',
            },
          }}
        />

        {children}
        <Analytics/>
      </body>
    </html>
  );
}
