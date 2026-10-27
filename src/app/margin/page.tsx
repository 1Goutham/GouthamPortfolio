import type { Metadata } from "next";
import MarginStudio from "./margin-studio";

export const metadata: Metadata = {
  title: "Margin | 1Gartlab",
  description: "An experimental playground: draw something weird and send it my way.",
};

export default function MarginPage() {
  return <MarginStudio />;
}
