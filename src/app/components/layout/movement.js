"use client"
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const AnimatedContent = ({
  children,
  distance = 100,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  onComplete,
  className = "",
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const axis = direction === "horizontal" ? "x" : "y";
        const offset = reverse ? -distance : distance;
        const startPct = (1 - threshold) * 100;

        gsap.set(el, {
          [axis]: offset,
          scale,
          opacity: animateOpacity ? initialOpacity : 1,
          willChange: "transform, opacity",
        });

        gsap.to(el, {
          [axis]: 0,
          scale: 1,
          opacity: 1,
          duration,
          ease,
          delay,
          onComplete: () => {
            gsap.set(el, { clearProps: "willChange" });
            onComplete?.();
          },
          scrollTrigger: {
            trigger: el,
            start: `top ${startPct}%`,
            toggleActions: "play none none none",
            once: true,
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { opacity: 1 });
      });
    }, el);

    return () => ctx.revert();
  }, [
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
    onComplete,
  ]);

  return <div ref={ref} className={className}>{children}</div>;
};

export default AnimatedContent;
