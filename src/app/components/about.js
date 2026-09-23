"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import BracketHeading from "./layout/bracket-heading";

// Drop your new portrait in at /public/about-portrait.png to swap the photo.
const PORTRAIT_SRC = "/about-portrait.png";

export default function About() {
  // The portrait has depth: it drifts a few pixels against the cursor, like
  // a print behind glass, and settles back on leave.
  const frameRef = useRef(null);
  const raf = useRef(0);
  const onPointerMove = useCallback((e) => {
    const el = frameRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--ax", `${(-x * 14).toFixed(1)}px`);
      el.style.setProperty("--ay", `${(-y * 10).toFixed(1)}px`);
    });
  }, []);
  const onPointerLeave = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    el.style.setProperty("--ax", "0px");
    el.style.setProperty("--ay", "0px");
  }, []);

  return (
    <div id="about" className="flex flex-col md:flex-row w-full bg-black min-h-[750px] md:min-h-screen">
      {/* Text Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-6 md:pl-8 md:pr-15">
        <div className="space-y-6">
          {/* Header */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <BracketHeading as="h1" className="text-white font-anonymous-pro text-3xl pt-5 md:pt-0 md:text-5xl">
              About Me!
            </BracketHeading>
          </ScrollReveal>

          {/* Intro */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="mt-3 md:mt-10">
              <h1 className="text-white font-outfit text-base md:text-2xl">
                Hey, I’m{" "}
                <span className="text-lg md:text-3xl font-medium link-underline">Goutham</span>
              </h1>
              <p className="text-white font-outfit font-thin text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                - a fullstack dev with a creative edge. I blend AI, design, and code to turn ideas into thoughtful digital products.
              </p>
            </div>
          </ScrollReveal>

          {/* AI – Dev + Design */}
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="mt-3 md:mt-6">
              <h1 className="text-white font-medium font-outfit text-base lg:text-2xl">
                AI <span className="text-base font-thin">&ndash;</span> Dev <span className="text-base font-thin">+</span> Design
              </h1>
              <p className="text-white font-outfit font-thin text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                Where ideas meet intelligent systems,<br />
                thoughtful design, and solid engineering.
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
                <span className="row-hover">Digital Engineer &ndash; DeepWeaver</span>
              </p>
            </div>
          </ScrollReveal>
           
        </div>
      </div>

      {/* Image Section - full-bleed like before, with a slow zoom + brighten on hover */}
      <div className="w-full md:w-1/2 flex justify-center items-center md:justify-end md:items-stretch p-6 md:p-0">
        <div
          ref={frameRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="about-portrait relative w-full h-[300px] md:h-auto md:self-stretch overflow-hidden rounded-xl md:rounded-none"
        >
          <Image
            className="object-cover object-left-top md:object-center"
            src={PORTRAIT_SRC}
            alt="Goutham - AI fullstack developer with a design foundation"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            quality={88}
          />
        </div>
      </div>
    </div>
  );
}
