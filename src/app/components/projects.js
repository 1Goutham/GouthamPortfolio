import { ArrowUpRight } from "lucide-react";
import FadeContent from "./layout/fade-in";
import ProjectTile from "./project-tile";

// Tile artwork lives at /public/<id>.png (the icon marks: robot, cap-lock,
// rounded square, logo). Each tile opens the live product.
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
    <section id="projects" className="bg-black px-6 py-16 text-white md:px-12 md:py-28">
      <div className="mx-auto max-w-5xl">
        <FadeContent duration={800} threshold={0.2}>
          <h2 className="font-anonymous-pro text-3xl md:text-5xl">[Projects]</h2>
          <p className="mt-4 font-outfit text-base text-white/75 md:mt-6 md:text-2xl">
            Products by <span className="font-medium text-white md:text-3xl">1Goutham</span>
          </p>
        </FadeContent>

        {/* While one tile is hovered the others step back a touch (see CSS). */}
        <ul className="project-grid mt-8 grid grid-cols-2 gap-4 md:mt-12 md:grid-cols-4 md:gap-6">
          {PROJECTS.map((p, i) => (
            <li key={p.id}>
              <FadeContent duration={800} threshold={0.2} delay={i * 90}>
                <ProjectTile {...p} />
              </FadeContent>
            </li>
          ))}
        </ul>

        <FadeContent duration={800} threshold={0.2}>
          <p className="mt-8 max-w-3xl font-outfit text-xs font-thin leading-relaxed text-white text-justify md:mt-12 md:text-base">
            A few things I&rsquo;ve designed and built from the ground up - blending thoughtful UX, full-stack
            engineering, and AI to turn ideas into useful digital products. Each project reflects how I
            approach the journey from concept and design to development and implementation.
          </p>

          <a
            href={EXPLORE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tactile group mt-8 inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-6 font-outfit text-sm font-medium text-black shadow-md hover:bg-[#f2f2f2] md:mt-10 md:text-base"
          >
            Explore more
            <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </a>
        </FadeContent>
      </div>
    </section>
  );
}
