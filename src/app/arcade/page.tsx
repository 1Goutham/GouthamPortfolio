import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import ArcadePage from "./arcade-page";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Arcade | Goutham G",
    description: "Five small retro games, starring me. Scores stay in your browser.",
    path: "/arcade",
    image: "arcade",
    alt: "Goutham's arcade: a green retro handheld console",
  }),
  robots: { index: false },
};

export default function Page() {
  return <ArcadePage />;
}
