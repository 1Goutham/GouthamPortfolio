"use client";

import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";

export default function About() {
  return (
    <div
      id="about"
      className="flex flex-col md:flex-row w-full bg-black min-h-[750px] md:min-h-screen"
    >
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
                <span className="text-lg md:text-3xl font-medium">Goutham</span>
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
                Experience <span className="text-base font-thin">+</span> Dev
              </h1>
              <p className="text-white font-outfit font-thin text-xs md:text-base mt-1 md:mt-3 text-justify max-w-md">
                Freelance Product Creator<br />
                Digital Engineer - DeepWeaver
              </p>
            </div>
          </ScrollReveal>
           
        </div>
      </div>

      {/* Image Section */}
      <div className="w-full md:w-1/2 flex justify-center items-center md:justify-end md:items-end p-6 md:p-0 -translate-y-5">
        <Image
          className="w-full h-[300px] md:h-full object-cover object-left-top md:object-center rounded-xl md:rounded-none"
          src="/portfoliopic1.png"
          alt="portfoliopic"
          width={600}
          height={600}
        />
      </div>
    </div>
  );
}
