"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import AnimatedContent from "./layout/movement";
import BracketHeading from "./layout/bracket-heading";

const TAGLINE = ["AI,", "Code", "&", "Product."];

// Drop the new skills artwork (portrait + radar) in at /public/skills-portrait.png to swap the image.
const SKILLS_IMAGE_SRC = "/skills-portrait.png";

export default function Skills() {
  // The radar leans a few degrees toward the cursor, like the hero portrait.
  const frameRef = useRef(null);
  const raf = useRef(0);
  const onPointerMove = useCallback((e) => {
    const el = frameRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--tilt-x", `${(-py * 10).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${(px * 12).toFixed(2)}deg`);
    });
  }, []);
  const onPointerLeave = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);

  return (
    <div
      id="skills"
      className="flex flex-col md:flex-row w-full bg-white items-center md:min-h-[560px] py-10 md:py-16"
    >
      {/* Image Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center order-1 px-6">
        <AnimatedContent
          distance={40}
          direction="vertical"
          duration={1}
          initialOpacity={0}
          animateOpacity
          scale={1.03}
          threshold={0.15}
        >
          <div ref={frameRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className="skills-radar">
            <Image
              className="w-[280px] md:w-[440px] aspect-square object-contain"
              src={SKILLS_IMAGE_SRC}
              alt="Goutham - portrait framed by a radar of curious, precise, expressive, intuitive and thoughtful"
              width={880}
              height={880}
              sizes="(max-width: 768px) 280px, 440px"
              draggable={false}
            />
          </div>
        </AnimatedContent>
      </div>

      {/* Text Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6 md:pr-12 order-2">
        <div className="space-y-6">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <BracketHeading as="h1" dark className="text-black font-anonymous-pro text-3xl pt-5 md:pt-0 md:text-5xl">
              Skills
            </BracketHeading>
          </ScrollReveal>

          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div>
              {/* Each word underlines in turn, left to right, on hover. */}
              <h1 className="skills-tagline text-black font-outfit text-base md:text-2xl">
                {TAGLINE.map((w, i) => (
                  <span key={w} className="skills-word" style={{ "--i": i }}>
                    {w}
                    {i < TAGLINE.length - 1 ? " " : ""}
                  </span>
                ))}
              </h1>
              <p className="text-black font-outfit text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                I bring together AI, full-stack engineering, and product design to build thoughtful digital products. I turn ideas into clean, scalable experiences with the right mix of technology, design, and intelligent systems.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div>
              <p className="text-black font-outfit text-xs md:text-base text-justify max-w-md">
                I care about what makes a product work — clear interactions, polished interfaces, solid engineering, and AI that adds real value.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
