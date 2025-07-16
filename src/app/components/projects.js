import SpotlightCard from "./layout/SpotlightCard"; 
import ShinyText from './layout/shiny-text';
import Image from "next/image";
import AnimatedContent from './layout/movement';
import FadeContent from './layout/fade-in';

export default function Projects() {
  const projects = [
    {
      title: "Ideako",
      tagline: "Your mini AI ideation buddy",
      description:
        "Ideako is a lightweight AI-powered tool built to spark creativity. From startup names and content hooks to product ideas and captions, Ideako helps you break creative blocks instantly through a simple, chat-like interface.",
      image: "/ideako.png",
      link: "https://ideako.vercel.app/"
    },
    {
      title: "ZtudyLock",
      tagline: "Distraction free studying",
      description:
        "ZtudyLock is a focused AI chatbot built for students. It only answers relevant study-related questions and gently redirects you when you're off track. Whether you're drifting into random thoughts or distractions, ZtudyLock keeps you focused and learning.",
      image: "/ztudylock.png",
      link: "https://ztudylock.vercel.app/"
    },
    {
      title: "FabricNest",
      tagline: "Modern E-Commerce Platform",
      description:
        "The platform supports user authentication, product management, dynamic pricing, filtering, cart management, secure checkout, and order tracking. It also features an intuitive admin panel to manage inventory, orders, and user roles.",
      image: "/ecommerce.png",
      link: "https://github.com/1Goutham"
    },
  ];

  return (
    <div id="projects" className="bg-black py-8 px-4 md:px-18 space-y-8">
      <div className="flex justify-center">
        <h1 className="text-white font-anonymous-pro text-3xl md:text-5xl md:p-10">[Projects]</h1>
      </div>

      <div className="flex flex-col items-center space-y-8 md:space-y-12">
        {projects.map((project, index) => (
          <FadeContent
            key={index}
            blur={true}
            duration={700}
            easing="ease-out"
            initialOpacity={0}
          >
            <AnimatedContent
              distance={40}
              direction="vertical"
              reverse={false}
              duration={0.8}
              initialOpacity={0.2}
              animateOpacity
              scale={1.02}
              threshold={0.2}
              delay={index * 0.4}
            >
              <SpotlightCard className="w-full group">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-14">
                  <Image
                    src={project.image}
                    alt={project.title}
                    width={300}
                    height={300}
                    className="rounded-xl p-2 md:pl-10 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="text-white space-y-3 md:pr-20 font-outfit">
                    <h2 className="text-lg font-outfit md:text-2xl font-medium">
                      <span className="font-medium text-4xl">{project.title}</span><br />
                      <span className="pt-1 block">{project.tagline}</span>
                    </h2>
                    <p className="text-sm md:text-lg font-light text-white text-justify" style={{ fontWeight: 300 }}>
                      {project.description}
                    </p>
                    <div className="mt-4 md:mt-0">
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href={project.link}
                          className="flex justify-center items-center w-30 gap-2 backdrop-blur-lg h-9 bg-white/10 border border-white/40 rounded-lg px-6 py-2 shadow-md hover:scale-105 transition-transform duration-300"
                        >
                      <ShinyText text="Explore" speed={2} disabled={false} />
                      <Image src="/arrow.png" alt="arrow" width={10} height={10} />
                      </a>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </AnimatedContent>
          </FadeContent>
        ))}
      </div>
    </div>
  );
}
