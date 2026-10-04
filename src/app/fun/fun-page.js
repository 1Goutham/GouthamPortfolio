"use client";

import { useRouter } from "next/navigation";
import PixelGame from "../components/pixel-game";

/* The Easter egg's own page. Closing the game goes back home. */
export default function FunPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-black">
      <PixelGame onClose={() => router.push("/")} />
    </main>
  );
}
