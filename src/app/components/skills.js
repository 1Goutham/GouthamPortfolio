"use client";

import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import AnimatedContent from "./layout/movement";

// Drop the new skills artwork (portrait + radar) in at /public/skills-portrait.png to swap the image.
const SKILLS_IMAGE_SRC = "/skills-portrait.png";

export default function Skills() {
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
          <Image
            className="w-[280px] md:w-[440px] aspect-square object-contain transition-transform duration-700 ease-out hover:scale-[1.02]"
            src={SKILLS_IMAGE_SRC}
            alt="Goutham - portrait framed by a radar of flowy, deep, edgy, playful and moody"
            width={880}
            height={880}
            sizes="(max-width: 768px) 280px, 440px"
          />
        </AnimatedContent>
      </div>

      {/* Text Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6 md:pr-12 order-2">
        <div className="space-y-6">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div className="flex justify-center md:justify-start">
              <h1 className="text-black font-anonymous-pro text-3xl pt-5 md:pt-0 md:text-5xl">
                [Skills]
              </h1>
            </div>
          </ScrollReveal>

          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div>
              <h1 className="text-black font-outfit text-base md:text-2xl">
                AI, Code &amp; Product.
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
