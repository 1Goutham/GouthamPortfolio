import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import FadeContent from "./layout/fade-in";

// Tile artwork lives at /public/<id>.png (the icon marks: robot,
// cap-lock, rounded square, logo). Each tile opens the live product.
const PROJECTS = [
  { id: "ideako", title: "Ideako", href: "https://ideako.vercel.app/" },
  { id: "ztudylock", title: "ZtudyLock", href: "https://ztudylock.vercel.app/" },
  { id: "fabricnest", title: "FabricNest", href: "https://aiecommerce-site.vercel.app/" },
  { id: "ideaguard", title: "IdeaGuard AI", href: "https://ideaguard-ai-zeta.vercel.app/" },
];

// Where "Explore more" goes. Point this at the projects page once it exists.
const EXPLORE_HREF = "https://github.com/1Goutham";

export default function Projects() {
  return (
    <section id="projects" className="bg-black px-6 py-16 text-white md:px-12 md:py-24">
      <div className="mx-auto max-w-3xl">
        <FadeContent duration={800} threshold={0.2}>
          <h2 className="font-anonymous-pro text-3xl md:text-5xl">[Projects]</h2>
          <p className="mt-3 font-outfit text-base text-white/70 md:mt-4 md:text-xl">
            Products by <span className="font-bold text-white">1Goutham</span>
          </p>
        </FadeContent>

        <ul className="mt-8 grid grid-cols-2 gap-4 md:mt-10 md:grid-cols-4 md:gap-5">
          {PROJECTS.map((p, i) => (
            <li key={p.id}>
              <FadeContent duration={800} threshold={0.2} delay={i * 90}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${p.title}, opens in a new tab`}
                  className="project-tile group relative block aspect-square overflow-hidden rounded-sm bg-[#2b2b2b] outline-none"
                  style={{ "--i": i }}
                >
                  <Image
                    src={`/${p.id}.png`}
                    alt=""
                    width={240}
                    height={240}
                    sizes="(max-width: 768px) 45vw, 170px"
                    draggable={false}
                    className="project-tile-icon absolute inset-0 m-auto h-[46%] w-[46%] select-none object-contain"
                  />
                  {/* Name slides up from the bottom edge on hover. */}
                  <span className="project-tile-name pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2.5 font-outfit text-xs text-white/85 md:text-[13px]">
                    {p.title}
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </span>
                </a>
              </FadeContent>
            </li>
          ))}
        </ul>

        <FadeContent duration={800} threshold={0.2}>
          <p className="mt-8 font-outfit text-sm font-light leading-relaxed text-white/85 text-justify md:mt-10 md:text-base">
            A few things I&rsquo;ve designed and built from the ground up - blending thoughtful UX, full-stack
            engineering, and AI to turn ideas into useful digital products. Each project reflects how I
            approach the journey from concept and design to development and implementation.
          </p>

          <a
            href={EXPLORE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tactile group mt-7 inline-flex h-10 items-center gap-1.5 rounded-md bg-white px-5 font-outfit text-sm font-medium text-black shadow-md hover:bg-[#f2f2f2] md:mt-8"
          >
            Explore more
            <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </a>
        </FadeContent>
      </div>
    </section>
  );
}
