import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Serve modern formats first; Next falls back automatically.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for a long time (they are content-addressed).
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
  },
  experimental: {
    // Tree-shake heavy animation libs down to what is actually imported.
    optimizePackageImports: ["framer-motion", "gsap", "lucide-react", "react-markdown"],
  },
};

export default nextConfig;
