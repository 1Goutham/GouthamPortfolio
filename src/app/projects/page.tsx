import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import ProjectsIndex from "./projects-index";

export const metadata: Metadata = pageMeta({
  title: "Projects | Goutham G",
  description: "Products by 1Goutham: Ideako, ZtudyLock, FabricNest and IdeaGuard. AI products, designed and built end to end.",
  path: "/projects",
  image: "projects",
  alt: "Projects by Goutham G: Ideako, ZtudyLock and FabricNest on phones",
});

export default function ProjectsPage() {
  return <ProjectsIndex />;
}
