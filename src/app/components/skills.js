"use client";

import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import AnimatedContent from "./layout/movement";
import BracketHeading from "./layout/bracket-heading";

const TAGLINE = ["Engineering", "meets", "imagination."];

// What I work across. Each tag wears the site's brackets and answers the cursor.
const TAGS = ["Full-stack development", "AI engineering", "Product design", "System architecture", "Creative technology"];

// Drop the new skills artwork (portrait + radar) in at /public/skills-portrait.png to swap the image.
const SKILLS_IMAGE_SRC = "/skills-portrait.png";

export default function Skills() {
  return (
    <div
      id="skills"
      className="flex flex-col md:flex-row w-full bg-white items-center md:min-h-[560px] py-12 md:py-16 gap-6 md:gap-0"
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
          {/* Hover: a radar sweep turns around the chart's circle (geometry in CSS). */}
          <div className="skills-radar relative">
            <span className="skills-sweep" aria-hidden="true" />
            <span className="skills-ring" aria-hidden="true" />
            <Image
              className="w-[250px] md:w-[440px] aspect-square object-contain"
              src={SKILLS_IMAGE_SRC}
              alt="Goutham - portrait framed by a radar of curious, precise, expressive, intuitive and thoughtful"
              width={880}
              height={880}
              sizes="(max-width: 768px) 250px, 440px"
              draggable={false}
            />
          </div>
        </AnimatedContent>
      </div>

      {/* Text Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6 md:pr-12 order-2">
        <div className="space-y-6">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <BracketHeading as="h2" dark className="text-black font-anonymous-pro text-3xl pt-5 md:pt-0 md:text-5xl">
              Skills
            </BracketHeading>
          </ScrollReveal>

          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div>
              {/* Each word underlines in turn, left to right, on hover. */}
              <h3 className="skills-tagline text-black font-outfit text-xl md:text-2xl">
                {TAGLINE.map((w, i) => (
                  <span key={w} className="skills-word" style={{ "--i": i }}>
                    {w}
                    {i < TAGLINE.length - 1 ? " " : ""}
                  </span>
                ))}
              </h3>
              <p className="text-black/70 font-outfit text-sm leading-relaxed md:text-base mt-2 md:mt-3 max-w-md">
                I bring together full-stack engineering, AI, and product design to build digital experiences from the
                first sketch to deployment.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div>
              {/* The one line that matters, on its own. */}
              <p className="text-black font-outfit text-sm leading-relaxed md:text-base max-w-md">
                I care about how things look, how systems work, and whether the final product genuinely solves a
                problem.
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-3 md:mt-6 md:gap-x-7" aria-label="Areas of work">
                {TAGS.map((t) => (
                  <li key={t} className="bracket-link bracket-link-dark font-anonymous-pro text-sm text-black md:text-base">
                    <span className="bracket-link-l" aria-hidden="true">[</span>
                    <span className="bracket-link-text">{t}</span>
                    <span className="bracket-link-r" aria-hidden="true">]</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
