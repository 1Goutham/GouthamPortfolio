import dynamic from "next/dynamic";
import { ld, personLd } from "@/lib/seo";
import Hero from "./components/Hero";
import Scrolltext from "./components/scroll";
import About from "./components/about";
import Skills from "./components/skills";
import Projects from "./components/projects";
import BeyondTeaser from "./components/beyond-teaser";
import MarginTeaser from "./components/margin-teaser";
import WorksStrip from "./components/works-strip";

// Below-the-fold, JS-heavy sections are code-split so the initial bundle stays lean.
const Gtalk = dynamic(() => import("./components/Gtalk"), {
  loading: () => <div className="bg-black h-[760px] md:h-[620px]" aria-hidden />,
});
const Contact = dynamic(() => import("./components/contact"));

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(personLd)} />
      <Hero />
      <Scrolltext />
      <About />
      <Skills />
      <Projects />
      <WorksStrip />
      <BeyondTeaser />
      <MarginTeaser />
      <Gtalk />
      <Contact />
    </>
  );
}
