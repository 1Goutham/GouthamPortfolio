import type { Metadata } from "next";
import WallAdmin from "./wall-admin";

export const metadata: Metadata = {
  title: "The wall (private) | Margin",
  robots: { index: false, follow: false },
  alternates: { canonical: "/margin/wall" },
};

export default function WallAdminPage() {
  return <WallAdmin />;
}
