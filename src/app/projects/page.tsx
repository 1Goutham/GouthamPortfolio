import type { Metadata } from "next";
import ProjectsIndex from "./projects-index";

export const metadata: Metadata = {
  title: "Projects | Goutham G",
  description: "Products by 1Goutham: ideas, interfaces and intelligence.",
};

export default function ProjectsPage() {
  return <ProjectsIndex />;
}
