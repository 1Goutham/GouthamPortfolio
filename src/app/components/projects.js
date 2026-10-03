"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import TransitionLink from "./layout/transition-link";
import BracketHeading from "./layout/bracket-heading";

// Marks live at /public/<id>.png; the character pointing at them is
// /public/project-icon.png. Each mark opens the live product.
const PROJECTS = [
  { id: "ideako", title: "Ideako", href: "https://ideako.vercel.app/" },
  { id: "ztudylock", title: "ZtudyLock", href: "https://ztudylock.vercel.app/" },
  { id: "fabricnest", title: "FabricNest", href: "https://aiecommerce-site.vercel.app/" },
  { id: "ideaguard", title: "IdeaGuard AI", href: "https://ideaguard-ai-zeta.vercel.app/" },
];

export default function Projects() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [hot, setHot] = useState(-1);

  // Fetch the Projects page's phone model in the background now, so the
  // phones are already in cache by the time the visitor gets there.
  useEffect(() => {
    if (document.querySelector('link[href="/models/iphone.glb"]')) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = "/models/iphone.glb";
    document.head.appendChild(link);
  }, []);

  // Play the entrance once the section is in the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="projects"
      ref={ref}
      className="projects bg-black px-6 py-16 font-outfit text-white md:px-12 md:py-28"
      data-inview={inView}
      style={{ "--hot": hot }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        {/* Left: name, heading, button */}
        <div>
          <TransitionLink
            href="/projects"
            className="projects-rise group inline-flex items-center gap-1 text-sm text-white/70 outline-none transition-colors hover:text-white focus-visible:text-white md:text-base"
            style={{ "--i": 0 }}
          >
            Products by <span className="font-semibold text-white">1Goutham</span>
            <ArrowUpRight className="nudge-diag h-[0.9em] w-[0.9em]" strokeWidth={2} aria-hidden="true" />
          </TransitionLink>

          <div className="mt-2 md:mt-3">
            <BracketHeading className="projects-rise font-anonymous-pro text-4xl md:text-5xl" style={{ "--i": 1 }}>
              Projects
            </BracketHeading>
          </div>

          <TransitionLink
            href="/projects"
            className="projects-rise btn-tactile group mt-6 inline-flex h-9 items-center gap-1 rounded-md bg-white px-3.5 text-[13px] font-medium text-black shadow-md hover:bg-[#f2f2f2] md:mt-7"
            style={{ "--i": 2 }}
          >
            View all projects
            <ArrowUpRight className="nudge-diag h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </TransitionLink>
        </div>

        {/* Right: pitch, then the character pointing at the four marks */}
        <div>
          <p className="projects-rise text-base font-light leading-relaxed text-white/90 md:text-lg" style={{ "--i": 1 }}>
            A few things I&rsquo;ve designed and built from the ground up - blending thoughtful UX, full-stack
            engineering, and AI to turn ideas into useful digital products. Each project reflects how I
            approach the journey from concept and design to development and implementation.
          </p>

          <div className="mt-7 flex items-center gap-5 md:mt-9 md:gap-6">
            <div className="projects-rise projects-char relative w-[96px] shrink-0 select-none md:w-[112px]" style={{ "--i": 3 }}>
              <Image
                src="/project-icon.png"
                alt="Goutham pointing at his projects"
                width={400}
                height={320}
                sizes="(max-width: 768px) 96px, 112px"
                draggable={false}
                className="h-auto w-full"
              />
            </div>

            <ul className="projects-marks flex items-center gap-3 md:gap-4" onMouseLeave={() => setHot(-1)}>
              {PROJECTS.map((p, i) => (
                <li key={p.id} className="relative">
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${p.title}, opens in a new tab`}
                    onMouseEnter={() => setHot(i)}
                    onFocus={() => setHot(i)}
                    onBlur={() => setHot(-1)}
                    className="projects-rise project-mark relative flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2a2a] outline-none md:h-14 md:w-14"
                    style={{ "--i": 4 + i }}
                  >
                    <Image
                      src={`/${p.id}.png`}
                      alt=""
                      width={120}
                      height={120}
                      sizes="56px"
                      draggable={false}
                      className="project-mark-icon h-[52%] w-[52%] select-none object-contain"
                    />
                    {/* Name floats up above the mark on hover. */}
                    <span className="project-mark-name pointer-events-none absolute -top-8 left-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-medium text-black">
                      {p.title}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
