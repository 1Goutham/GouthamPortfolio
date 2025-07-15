'use client';

import Image from "next/image";
import GooeyNav from './layout/navbar';
import ShinyText from './layout/shiny-text';
import AnimatedContent from './layout/movement'
import FadeContent from './layout/fade-in'

export default function Hero() {

  const items = [
    { label: "Home", href: "#" },
    { label: "About", href: "#about" },
    { label: "Projects", href: "#projects" },
    { label: "Resume", href: "#" }
  ];

  return (
    <div className="relative overflow-hidden h-[550px] md:h-[780px] bg-black">
      <nav className="flex justify-between items-center p-6 relative z-10">
        <div>
          <Image src="/logo.png" width={40} height={40} alt="mylogo" />
        </div>
        <div className="hidden md:block">
          <GooeyNav
            items={items}
            particleCount={10}
            particleDistances={[60, 10]}
            particleR={50}
            initialActiveIndex={0}
            animationTime={300}
            timeVariance={300}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </div>
        <button className="flex justify-center items-center backdrop-blur-lg h-9 bg-white/10 border border-white/40 rounded-3xl px-6 py-2 shadow-md hover:scale-105 transition-transform duration-300" onClick={() => window.open('https://www.linkedin.com/in/goutham-g-98a0ba253/')}>
          <ShinyText text="Contact!" disabled={false} speed={2} className="custom-class" />
        </button>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-center items-center h-full relative">
        <div className="order-1 md:order-2">
          <FadeContent blur={true} duration={2500} easing="ease-out" initialOpacity={0}>
          <Image
            className="pt-10 md:pt-2 w-[300px] md:w-[500px] md:-translate-x-30"
            src="/welcome-typography.png"
            width={500}
            height={500}
            alt="welcome typography"
          />
          </FadeContent>
        </div>

        <div className="order-2 md:order-1">
          <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
          <AnimatedContent
            distance={50}
            direction="vertical"
            reverse={false}
            duration={1.2}
            //ease="bounce.out"
            initialOpacity={0.2}
            animateOpacity
            scale={1.1}
            threshold={0.2}
            delay={0.3}
          >
            <Image
              className="pt-3 md:pt-35"
              src="/animated-img.png"
              width={800}
              height={800}
              alt="animated visual"
            />
          </AnimatedContent>
          </FadeContent>
        </div>
        
      </div>
    </div>
  );
}
