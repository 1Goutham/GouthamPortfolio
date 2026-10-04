import type { Metadata } from "next";
import FunPage from "./fun-page";

export const metadata: Metadata = {
  title: "2px out of place | Goutham G",
  description: "A small game: nudge the line into place. Lower is better.",
  robots: { index: false },
};

export default function Page() {
  return <FunPage />;
}
