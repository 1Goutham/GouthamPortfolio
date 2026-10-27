/**
 * G-Talk knowledge base.
 *
 * G-Talk and the site agent answer by retrieval (see src/lib/rag.ts): each
 * question pulls the few entries closest to it, and only those go to the
 * model. Keep each entry short and on a single topic (roughly 40-120 words)
 * so it retrieves cleanly, and name the subject in the text itself ("1G-works
 * offers...", not "It offers..."). Add, edit or remove entries freely;
 * changes go live with the next deploy.
 */
export type KnowledgeChunk = {
  id: string;
  /** Section heading the entry is filed under in the prompt. */
  title: string;
  text: string;
};

export const KNOWLEDGE: KnowledgeChunk[] = [
  /* ---------------------------------------------------------------- */
  /*  About                                                            */
  /* ---------------------------------------------------------------- */
  {
    id: 'bio',
    title: 'About',
    text: `Goutham G (Goutham Gopinath) is a Full Stack Developer, UI/UX Designer and Digital Engineer based in Coimbatore, Tamil Nadu, India, with a growing focus on AI-powered product engineering. He brings together frontend and full-stack development, interface design and AI integrations, and enjoys turning ideas into usable digital products. His work spans web applications, AI-assisted learning and creativity tools, e-commerce and product concepts.`,
  },
  {
    id: 'positioning',
    title: 'About',
    text: `One line: "Full Stack Developer & UI/UX Designer building thoughtful digital experiences and exploring the next generation of AI-powered products." His strength is connecting interface quality with technical implementation and product thinking: he designs the experience, builds it, connects it to services and makes it useful. He is interested in the space where software engineering, design and AI product development meet.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Education                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: 'education',
    title: 'Education',
    text: `Goutham completed a B.Tech in Artificial Intelligence and Data Science at Sri Eshwar College of Engineering, Coimbatore (June 2021 to June 2025) with a CGPA of 7.6/10. It gave him an academic foundation in AI and data science; his practical interests run to web application development, interface design, AI integrations and building end-user products.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Experience                                                       */
  /* ---------------------------------------------------------------- */
  {
    id: 'role-deepweaver',
    title: 'Experience',
    text: `Goutham works with DeepWeaver.AI, an Australia-based company, remotely. He joined as a Creative Designer Intern (October 2024 to July 2025) and now works as a Digital Engineer. The role combines digital design and visual communication with web and digital experience development: design execution with technical implementation, plus web and creative support for digital and marketing work.`,
  },
  {
    id: 'role-freelance',
    title: 'Experience',
    text: `Before that, from August 2023 to September 2024, Goutham worked as a freelance Graphic Developer and Designer: graphic and visual design, digital creative work, and design-to-development workflows for clients.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Skills                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: 'skills-overview',
    title: 'Skills',
    text: `Goutham works across frontend and full-stack development, UI/UX design and AI integrations. The technologies listed are ones he has used, worked with or studied; he is not an expert in every item, and G-Talk should distinguish professional experience, hands-on projects, experiments and current learning.`,
  },
  {
    id: 'skills-frontend',
    title: 'Skills',
    text: `Frontend: HTML, CSS, JavaScript, React, Next.js (including the App Router), TypeScript fundamentals, Tailwind CSS, Vite, Redux Toolkit, responsive and component-based UI, API integration, and UI animation with Framer Motion and GSAP.`,
  },
  {
    id: 'skills-backend',
    title: 'Skills',
    text: `Backend and full-stack: Node.js, Express.js, REST API development and integration, MongoDB, Supabase, PostgreSQL concepts and hosted options such as Neon, authentication and data-service integration, and connecting frontends to backend services and external APIs.`,
  },
  {
    id: 'skills-design',
    title: 'Skills',
    text: `UI/UX and visual design: Figma, Adobe Creative Cloud and Webflow. Interface design and visual hierarchy, layout, spacing, typography, colour and component consistency, responsive and mobile refinement, interaction design and motion. Landing pages, portfolio and marketing sites, product interfaces, visual storytelling and brand-oriented digital design, and translating a visual concept into a working frontend.`,
  },
  {
    id: 'skills-ai',
    title: 'Skills',
    text: `AI application development: generative AI product concepts, AI API integration, chatbot interfaces, prompt design and custom instructions, Retrieval-Augmented Generation (RAG) concepts and experiments, LangChain, FAISS vector search, FastAPI for an experimental AI backend, Hugging Face model experiments (including google/gemma-2b-it), Ollama and local models (Gemma 3), Streamlit prototypes, AI SDKs, and Model Context Protocol (MCP) exploration. He builds AI features into web products rather than treating AI as a standalone demo.`,
  },
  {
    id: 'skills-tooling',
    title: 'Skills',
    text: `Tools and deployment: Git and GitHub, Vercel, Netlify, deployment and troubleshooting of modern web apps (build issues, linting, case-sensitive paths), and web hosting with domain and DNS configuration. Data and AI infrastructure explored: FAISS, Supabase, Pinecone, Neon/PostgreSQL, vector search and embedding-based retrieval. Docker and CI/CD are learning areas rather than confirmed production implementations.`,
  },
  {
    id: 'certifications',
    title: 'Skills',
    text: `Certifications: Google UX Design Certificate, IBM UI/UX Design Specialization, Full Stack Web Development, Generative AI Fundamentals, and AI Tools with KNIME and Tableau.`,
  },

  /* ---------------------------------------------------------------- */
  /*  AI focus                                                         */
  /* ---------------------------------------------------------------- */
  {
    id: 'ai-focus',
    title: 'AI focus',
    text: `Goutham is actively working towards stronger AI engineering and AI product engineering capability. His interest is not limited to prompting a model: he wants to understand how AI features become useful software. Topics he has explored or is deepening: LLM-powered application development, chatbot UX, prompt design and orchestration, RAG (ingestion, chunking, embeddings, retrieval, vector databases), LangChain, FastAPI AI services, Ollama, Hugging Face, agentic and multi-step workflows, MCP, AI learning assistants, evaluation and reliability, and production-minded deployment with Docker and CI/CD.`,
  },
  {
    id: 'ai-roadmap',
    title: 'AI focus',
    text: `His learning roadmap: strengthen full-stack fundamentals and ship reliable web products; improve problem-solving through consistent LeetCode practice; go deeper on LLM applications, RAG, embeddings, retrieval and evaluation; build practical AI projects rather than tutorials; learn deployment, system design and testing; and progress towards advanced AI product engineering, including agentic workflows and more capable AI learning tools. Frame these as ambitions and current work, not completed outcomes.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Approach                                                         */
  /* ---------------------------------------------------------------- */
  {
    id: 'design-philosophy',
    title: 'Approach',
    text: `Design preferences: minimal, polished, modern and professional; Gen Z-aware without being gimmicky; premium quality through strong typography and spacing; clear hierarchy and purposeful motion; natural, well-composed visuals rather than generic imagery; layouts that work on mobile as well as desktop; personality balanced with usability; and close attention to alignment, consistency and small UI details.`,
  },
  {
    id: 'working-style',
    title: 'Approach',
    text: `Development preferences: build usable, deployable projects; connect design decisions to real implementation; keep the interface and product experience in focus rather than the stack alone; debug and refine until the result feels coherent; explore modern frontend tools and interaction patterns; and favour projects that show real product thinking. His motto on the site: good design makes you stay, solid code makes it work, the right AI makes it think.`,
  },
  {
    id: 'creative-interests',
    title: 'Approach',
    text: `Creative interests: product ideation, AI-assisted creativity, digital storytelling and branding, and film and story development (dark comedy, thrillers, action and unusual genre combinations). The film interest is personal, not professional film-industry experience.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Projects                                                         */
  /* ---------------------------------------------------------------- */
  {
    id: 'project-ideako',
    title: 'Projects',
    text: `Ideako, "AI Creative Partner", is an AI creative workspace that learns your voice, understands your references, and helps turn rough ideas into original social content. Features: personal voice profile, reference library, AI content generation, post refinement, AI insights, smart hashtags, content history and multi-model AI. Built with Next.js. Live at https://ideako.vercel.app/, code at https://github.com/1Goutham/Ideako.`,
  },
  {
    id: 'project-ztudylock',
    title: 'Projects',
    text: `ZtudyLock, "Adaptive AI Study Workspace", turns a student's own learning material into a personalised study system: understanding concepts, practising, finding weaknesses and revising what needs attention. Features: material-aware AI tutor, concept extraction, adaptive study plans, quizzes and flashcards, weakness detection, revision passes, mastery tracking and exam mode. Built with Next.js. Directions still being explored include persistent memory, RAG, multi-agent features and learning analytics; describe those as planned unless confirmed live. Live at https://ztudylock.vercel.app/, code at https://github.com/1Goutham/ZtudyLock.`,
  },
  {
    id: 'project-fabricnest',
    title: 'Projects',
    text: `FabricNest, "Intelligent Commerce Platform", is a full-stack commerce platform built around discovery, personalisation and real purchasing: a premium storefront with intent-based discovery, an AI shopping assistant, personalised recommendations, product search and filters, cart and wishlist, Stripe checkout, order management and an admin system. Built with Next.js, TypeScript and MongoDB. Live at https://aiecommerce-site.vercel.app/, code at https://github.com/1Goutham/fabric-store.`,
  },
  {
    id: 'project-ideaguard',
    title: 'Projects',
    text: `IdeaGuard AI, "AI Product Intelligence", is an agentic AI workspace that researches, stress-tests and turns early-stage ideas into evidence-backed product strategy using a multi-agent architecture: market research, competitive analysis, feasibility assessment, risk analysis, assumption stress testing, MVP planning, experiments, and a PRD and technical blueprint. Earlier prototyping used Streamlit and Ollama with Gemma 3. Live at https://ideaguard-ai-zeta.vercel.app/, code at https://github.com/1Goutham/IdeaGuardAI. Do not claim user numbers or commercial traction.`,
  },
  {
    id: 'project-portfolio',
    title: 'Projects',
    text: `This portfolio (1goutham.space) is built with Next.js and Tailwind CSS, set in Outfit and Anonymous Pro, with GSAP, Lenis and Three.js for motion and 3D. It presents Goutham's profile, work and skills, and is itself a demonstration of his frontend engineering and visual design: minimal, polished, responsive, with contemporary motion and interaction patterns. Do not claim performance metrics or awards.`,
  },
  {
    id: 'project-gtalk',
    title: 'Projects',
    text: `G-Talk is the assistant on this portfolio, built by Goutham himself. It uses retrieval-augmented generation (RAG): each question is matched against a curated knowledge base about Goutham with embeddings and keyword search, and only the closest entries are given to the model, so answers stay grounded. It only speaks about Goutham and his work and keeps its answers short.`,
  },
  {
    id: 'project-agent',
    title: 'Projects',
    text: `The site also has a G-Talk agent, the small "Hey! What's on your mind?" pill stuck to the bottom-left corner of every page. Beyond answering questions it acts on the site: it can take visitors to a page or section, open a 1G-works panel, spotlight something like a specific project, or open his GitHub or LinkedIn. Goutham built it as an agentic layer over the same RAG knowledge base, with every action checked against a fixed map of the site.`,
  },

  /* ---------------------------------------------------------------- */
  /*  1G-works                                                         */
  /* ---------------------------------------------------------------- */
  {
    id: 'works-overview',
    title: '1G-works',
    text: `1G-works (also written 1GWorks; the site jokes "1Goutham Space Works" because it lives at 1goutham.space/works) is Goutham's freelance studio for businesses. Its line is "Ideas into digital impact" and "Let's build your digital presence": 1G-works brings design, technology and AI together to help a business build a stronger online presence, reach the right audience and turn ideas into meaningful growth. It has its own page at /works.`,
  },
  {
    id: 'works-services',
    title: '1G-works',
    text: `1G-works offers four services. Brand & Creative: how a business looks, feels and connects with people (branding, visual identity, graphic design, content creation). Web & Digital: fast, well-designed websites and digital products (websites, web apps, UI/UX design, e-commerce). Digital Growth: helping the right people find a business and come back (SEO, social media, performance marketing, analytics). Software & AI: custom software and AI that does the heavy lifting (custom software, AI integration, automation, chatbots).`,
  },
  {
    id: 'works-enquiry',
    title: '1G-works',
    text: `To start a project with 1G-works, use the enquiry form on the last panel of /works ("Contact to get started"): your name, where to reach you, which services you need and anything else worth knowing. The homepage contact form and email (gouthamgopinath.tsi@gmail.com) work too. 1G-works publishes no fixed prices; cost depends on the scope, so never quote prices, timelines, team size or past clients.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Around the site                                                  */
  /* ---------------------------------------------------------------- */
  {
    id: 'site-map',
    title: 'Around the site',
    text: `The site's pages: the homepage (intro, About, Skills, Projects, the 1G-works strip, "A Bit More About Me", the Margin teaser, the G-Talk chat and Contact); /projects with every project in detail; /beyond, his personal story; /arcade, five retro games; /margin, a drawing playground; and /works, the 1G-works studio. The hero also has a small dock in its corner linking to Beyond, Projects and the arcade.`,
  },
  {
    id: 'site-beyond',
    title: 'Around the site',
    text: `The Beyond page (/beyond) is Goutham's personal story, "not the resume version". He is curious, notices small details (he will spend two hours on something 2px out of place) and loves retro gaming. He started freelancing as a designer in college; his first client asked for a set of game cards and paid a little extra, which pushed him into design. He moved from graphic design into web design and UX, then spent nearly a year learning full-stack development so he could build what he designed, and later brought AI into the products he builds.`,
  },
  {
    id: 'site-margin',
    title: 'Around the site',
    text: `Margin (/margin) is an experimental drawing playground by 1Gartlab, Goutham's creative label ("'til death, we do art."). The whole page is paper: visitors pick a fountain pen, pencil, marker, fineliner, watercolour brush or eraser and a colour, draw anything, then save the drawing or send it to Goutham by email or Instagram. On the homepage it is teased by a band of stickers you can drag and throw.`,
  },
  {
    id: 'site-arcade',
    title: 'Around the site',
    text: `The Arcade (/arcade) has five small retro games starring Goutham. Scores stay in the visitor's own browser. It is reached from the question mark in the hero's corner dock, or from the little console on the Beyond page.`,
  },
  {
    id: 'project-rag-experiment',
    title: 'Projects',
    text: `If asked about RAG work: Goutham experimented with a document question-answering backend using FastAPI, LangChain and FAISS, loading a PDF into a vector index and answering with retrieval-grounded responses. It is an experiment and prototype, not a production RAG platform.`,
  },
  {
    id: 'project-learning-portal',
    title: 'Projects',
    text: `Only if asked: Goutham is building a personal learning portal, separate from this portfolio, with Next.js on Vercel, to organise study, track progress and support his move towards advanced AI engineering. Treat it as in progress unless he confirms a release.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Career                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: 'career-goals',
    title: 'Career',
    text: `Goals: grow into a strong full-stack and product engineer with meaningful AI engineering capability; use the combination of development and design as a differentiator; build polished products that are useful, not merely visually impressive; keep improving AI systems, RAG, agentic workflows, DSA and system design; and move towards a stable role at an established company. Frame these as ambitions.`,
  },
  {
    id: 'career-prep',
    title: 'Career',
    text: `Goutham has prepared for software engineering interviews with LeetCode and data structures and algorithms practice, aptitude and coding mock tests, and object-oriented and system-design exercises (taxi booking, library management, parking systems). This is preparation history, not confirmation of any interview result or offer. Do not discuss compensation expectations.`,
  },
  {
    id: 'availability',
    title: 'Career',
    text: `Goutham is open to full-time roles, freelance projects and collaborations involving frontend or full-stack development, product design, or applied AI. The best first step is a short message through the contact form describing the project.`,
  },

  /* ---------------------------------------------------------------- */
  /*  Contact                                                          */
  /* ---------------------------------------------------------------- */
  {
    id: 'contact',
    title: 'Contact',
    text: `You can reach Goutham through the contact form at the bottom of this site, by email at gouthamgopinath.tsi@gmail.com, on LinkedIn at https://www.linkedin.com/in/goutham-g-98a0ba253/, on Instagram at https://www.instagram.com/tanger.ineee/ or on GitHub at https://github.com/1Goutham. He is based in Coimbatore, India and usually replies within a day. Never invent other contact details.`,
  },
];
