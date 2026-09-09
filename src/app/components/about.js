"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import AnimatedContent from "./layout/movement";

// Drop your new portrait in at /public/about-portrait.png to swap the photo.
const PORTRAIT_SRC = "/about-portrait.png";

export default function About() {
  const cardRef = useRef(null);
  const frame = useRef(0);
  const pointer = useRef({ x: 0.5, y: 0.5 });

  // Cursor-tracked tilt + light sweep, written straight to CSS vars (no re-renders).
  const onMove = useCallback((e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pointer.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { x, y } = pointer.current;
      el.style.setProperty("--py", `${(x - 0.5) * 6}deg`);
      el.style.setProperty("--px", `${(0.5 - y) * 6}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
  }, []);

  const onLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0deg");
    el.style.setProperty("--py", "0deg");
  }, []);

  return (
    <div id="about" className="flex flex-col md:flex-row w-full bg-black min-h-[750px] md:min-h-screen">
      {/* Text Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-6 md:pl-8 md:pr-15">
        <div className="space-y-6">
          {/* Header */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="flex justify-center md:justify-start">
              <h1 className="text-white font-anonymous-pro text-3xl pt-5 md:pt-0 md:text-5xl">
                [About Me!]
              </h1>
            </div>
          </ScrollReveal>

          {/* Intro */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="mt-3 md:mt-10">
              <h1 className="text-white font-outfit text-base md:text-2xl">
                Hey, I’m{" "}
                <span className="text-lg md:text-3xl font-medium link-underline">Goutham</span>
              </h1>
              <p className="text-white font-outfit font-thin text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                - a fullstack dev with a creative edge. I believe good design makes you stay, great UX makes you move, and smart code makes it all possible.
              </p>
            </div>
          </ScrollReveal>

          {/* Design + Dev */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="mt-3 md:mt-6">
              <h1 className="text-white font-medium font-outfit text-base lg:text-2xl">
                Design <span className="text-base font-thin">+</span> Dev
              </h1>
              <p className="text-white font-outfit font-thin text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                Design thinks. Dev builds.<br />
                Blending both to craft smart, simple, sleek.
              </p>
            </div>
          </ScrollReveal>

          {/* Experience */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="mt-3 md:mt-6">
              <h1 className="text-white font-medium font-outfit text-base lg:text-2xl">
                Experience
              </h1>
              <p className="text-white font-outfit font-thin text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                <span className="row-hover">Freelance Product Creator</span><br />
                <span className="row-hover">Digital Engineer - DeepWeaver</span>
              </p>
            </div>
          </ScrollReveal>
           
        </div>
      </div>

      {/* Image Section - framed print with grain, light sweep and cursor tilt */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-6 md:p-10 lg:p-16">
        <AnimatedContent
          distance={40}
          direction="vertical"
          duration={1.1}
          initialOpacity={0}
          animateOpacity
          scale={1.04}
          threshold={0.2}
          className="w-full max-w-[560px]"
        >
          <div
            ref={cardRef}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className="portrait-card relative w-full aspect-square overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10"
          >
            <Image
              className="object-cover"
              src={PORTRAIT_SRC}
              alt="Goutham - AI fullstack developer with a design foundation"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 560px"
              quality={88}
            />
          </div>
        </AnimatedContent>
      </div>
    </div>
  );
}
