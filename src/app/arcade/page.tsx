import type { Metadata } from "next";
import ArcadePage from "./arcade-page";

export const metadata: Metadata = {
  title: "Arcade | Goutham G",
  description: "Five small retro games, starring me. Scores stay in your browser.",
  robots: { index: false },
};

export default function Page() {
  return <ArcadePage />;
}
