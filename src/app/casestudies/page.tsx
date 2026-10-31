import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import CaseStudies from "./case-studies";

export const metadata: Metadata = pageMeta({
  title: "Case Studies | Goutham G",
  description:
    "How Ideako, ZtudyLock, FabricNest, IdeaGuard AI and this portfolio were made: the problem, the decisions and the build, file by file.",
  path: "/casestudies",
  image: "projects",
  alt: "Case studies by Goutham G: a case file of products",
});

export default function CaseStudiesPage() {
  return <CaseStudies />;
}
