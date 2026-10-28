import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import MarginStudio from "./margin-studio";

export const metadata: Metadata = pageMeta({
  title: "Margin | 1Gartlab",
  description: "An experimental playground: draw something weird, pin it to the wall, or send it my way.",
  path: "/margin",
  image: "margin",
  alt: "Margin by 1Gartlab: draw something weird and pin it to the wall",
});

export default function MarginPage() {
  return <MarginStudio />;
}
