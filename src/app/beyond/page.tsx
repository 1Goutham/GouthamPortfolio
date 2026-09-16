import type { Metadata } from "next";
import BeyondStory from "./beyond-story";

export const metadata: Metadata = {
  title: "Beyond | Goutham G",
  description: "A minute for my story: how design led to code, and code led to AI.",
};

export default function BeyondPage() {
  return <BeyondStory />;
}
