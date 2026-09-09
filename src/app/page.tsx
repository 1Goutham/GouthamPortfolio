import dynamic from "next/dynamic";
import Hero from "./components/Hero";
import Scrolltext from "./components/scroll";
import About from "./components/about";
import Skills from "./components/skills";
import Projects from "./components/projects";

// Below-the-fold, JS-heavy sections are code-split so the initial bundle stays lean.
const Gtalk = dynamic(() => import("./components/Gtalk"), {
  loading: () => <div className="bg-black h-[600px] md:h-[500px]" aria-hidden />,
});
const Contact = dynamic(() => import("./components/contact"));

export default function Home() {
  return (
    <>
      <Hero />
      <Scrolltext />
      <About />
      <Skills />
      <Projects />
      <Gtalk />
      <Contact />
    </>
  );
}
