import type { Metadata } from "next";
import BeyondStory from "./beyond-story";

export const metadata: Metadata = {
  title: "Beyond | Goutham G",
  description: "A bit more about me: how design led to code, and code led to AI.",
};

export default function BeyondPage() {
  return <BeyondStory />;
}
