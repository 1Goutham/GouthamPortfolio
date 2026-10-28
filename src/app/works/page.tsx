import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import WorksDeck from "./works-deck";

export const metadata: Metadata = pageMeta({
  title: "1G-works | Design, web, growth and AI for your business",
  description:
    "1G-works brings design, technology and AI together to help businesses build a stronger digital presence.",
  path: "/works",
  image: "works",
  alt: "1G-works: ideas into digital impact",
});

export default function WorksPage() {
  return <WorksDeck />;
}
