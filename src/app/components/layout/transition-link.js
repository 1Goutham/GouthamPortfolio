"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const VEIL_MS = 420;

/**
 * A Next `Link` that fades the screen to black before it navigates, so a
 * route change reads as one continuous motion instead of a hard cut. The
 * destination page is responsible for fading its own content back in.
 *
 * Modified clicks (new tab, middle click) and reduced-motion users get the
 * plain link behaviour.
 */
export default function TransitionLink({ href, children, className = "", onClick, ...rest }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    e.preventDefault();
    setLeaving(true);
    timer.current = setTimeout(() => router.push(href), VEIL_MS);
  };

  return (
    <>
      <Link href={href} className={className} onClick={handleClick} {...rest}>
        {children}
      </Link>
      {leaving && <span className="page-veil" aria-hidden="true" />}
    </>
  );
}
