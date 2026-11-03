import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import NotACaseStudy from "./not-a-case-study";

export const metadata: Metadata = pageMeta({
  title: "Case Studies | Goutham G",
  description:
    "Case studies by Goutham G: how his products are made, from the first idea to the thing you can use.",
  path: "/casestudies",
  image: "projects",
  alt: "Case studies by Goutham G",
});

export default function CaseStudiesPage() {
  return <NotACaseStudy />;
}
