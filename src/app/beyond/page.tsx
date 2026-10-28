import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import BeyondStory from "./beyond-story";

export const metadata: Metadata = pageMeta({
  title: "Beyond | Goutham G",
  description: "A bit more about me, not the resume version: how design led to code, and code led to AI.",
  path: "/beyond",
  image: "beyond",
  alt: "Beyond: a bit more about Goutham, not the resume version",
});

export default function BeyondPage() {
  return <BeyondStory />;
}
