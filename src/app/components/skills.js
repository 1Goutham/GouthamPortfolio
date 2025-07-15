"use client";

import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import FadeContent from "./layout/fade-in";


export default function Skills() {
  return (
    <div
      id="skills"
      className="flex flex-col md:flex-row w-full bg-white items-stretch"
    >
      {/* Text Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center md:items-center md:justify-center pl-6 pr-6 order-1 md:order-2">
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
                Stack I Rely On
              </h1>
              <p className="text-black font-outfit text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
               I work with a focused set of tools across design, development, and AI to build clean, functional, and user-centered web experiences. I value consistency, responsiveness, and maintainable code that serves real needs.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={10}>
            <div>
              <p className="text-black font-outfit text-xs md:text-base text-justify max-w-md">
              Every decision I make stems from clarity and purpose. I care about the details that improve usability, performance, and the overall experience.
              </p>
            </div>
          </ScrollReveal>
          <div>
            <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
            <Image src="/logos.png" alt="SkillsLogos" width={300} height={300} />
            </FadeContent>
            </div>
        </div>
        
      </div>

      {/* Image Section */}
      <div className="w-full md:w-1/2 flex justify-center items-end md:justify-center md:items-end order-2 md:order-1">
      
        <Image
          className=" w-full h-[300px] md:w-[550px] md:h-[400px] object-contain"
          src="/picwlap.png"
          alt="portfoliopic"
          width={300}
          height={300}
        />
      </div>
    </div>
  );
}
