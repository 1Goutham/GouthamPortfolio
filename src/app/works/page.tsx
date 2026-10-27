import type { Metadata } from "next";
import WorksDeck from "./works-deck";

export const metadata: Metadata = {
  title: "1G-works | Design, web, growth and AI for your business",
  description:
    "1G-works brings design, technology and AI together to help businesses build a stronger digital presence.",
};

export default function WorksPage() {
  return <WorksDeck />;
}
