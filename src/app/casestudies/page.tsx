import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import NotACaseStudy from "./not-a-case-study";

export const metadata: Metadata = pageMeta({
  title: "Not a Case Study | Goutham G",
  description:
    "How Goutham thinks about making things: curiosity, experiments, thoughtful design, purposeful AI and the 1G identity.",
  path: "/casestudies",
  image: "projects",
  alt: "Not a case study: how Goutham G makes things",
});

export default function CaseStudiesPage() {
  return <NotACaseStudy />;
}
