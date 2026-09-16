/**
 * G-Talk knowledge base.
 *
 * The whole list is handed to Gemini in G-Talk's system prompt, grouped by
 * `title`. Keep each entry short and on a single topic (roughly 40-120 words)
 * so the prompt stays small. Add, edit or remove entries freely; changes go
 * live with the next deploy.
 */
export type KnowledgeChunk = {
  id: string;
  /** Section heading the entry is filed under in the prompt. */
  title: string;
  text: string;
};

export const KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: 'bio',
    title: 'About',
    text: `Goutham Gopinath is an AI full-stack developer with a design foundation, based in Chennai, India. He blends product design, full-stack engineering and applied AI to build thoughtful digital products. His motto: good design makes you stay, great UX makes you move, and smart code makes it all possible.`,
  },
  {
    id: 'education',
    title: 'Education',
    text: `Goutham completed a B.Tech in Artificial Intelligence and Data Science (2021 to 2025) at Sri Eshwar College of Engineering, Coimbatore, graduating with an 8 CGPA.`,
  },
  {
    id: 'role-deepweaver',
    title: 'Experience',
    text: `Goutham currently works remotely as a Digital Engineer at DeepWeaver.AI, headquartered in Australia. He owns UI/UX design using Figma, Webflow and design systems, and supports marketing with LinkedIn graphics and product demo videos.`,
  },
  {
    id: 'role-freelance',
    title: 'Experience',
    text: `From 2022 to 2023 Goutham freelanced as a Full Stack Developer and Designer, delivering complete client solutions with the React stack, Webflow and Figma. He handled both design and front-end development, including client revisions and launches.`,
  },
  {
    id: 'skills-overview',
    title: 'Skills',
    text: `Goutham brings together AI, full-stack engineering and product design. He turns ideas into clean, scalable experiences with the right mix of technology, design and intelligent systems, and cares about clear interactions, polished interfaces, solid engineering and AI that adds real value.`,
  },
  {
    id: 'skills-stack',
    title: 'Skills',
    text: `Languages: TypeScript, JavaScript, HTML5, CSS3. Frameworks and libraries: React.js, Next.js, Express.js, Tailwind CSS, Vite. Databases: MongoDB. AI: Gemini and OpenAI APIs, retrieval-augmented generation (RAG), prompt design. Design tools: Figma, Adobe Illustrator, Webflow. DevOps and tooling: Git, GitHub, Vercel, Netlify, Docker, Postman.`,
  },
  {
    id: 'certifications',
    title: 'Certifications',
    text: `Certifications: Google UX Design Certificate, IBM UI/UX Design Specialization, Full Stack Web Development, Generative AI Fundamentals, and AI Tools with KNIME and Tableau.`,
  },
  {
    id: 'project-ideako',
    title: 'Projects',
    text: `Ideako (2024) is a lightweight AI-powered creative tool, "your mini AI ideation buddy". It generates startup names, content hooks, product ideas, captions and hashtags through a simple chat-like interface to break creative blocks. Live at https://ideako.vercel.app/.`,
  },
  {
    id: 'project-ztudylock',
    title: 'Projects',
    text: `ZtudyLock (2025) is a focused AI chatbot for distraction-free studying, built with Next.js, the OpenAI API and MongoDB. It only answers study-related questions and gently redirects students when they drift off track. Live at https://ztudylock.vercel.app/.`,
  },
  {
    id: 'project-fabricnest',
    title: 'Projects',
    text: `FabricNest (2024) is a modern e-commerce platform built with Next.js, TypeScript and MongoDB. It supports user authentication, product management, dynamic pricing, filtering, cart management, secure checkout, order tracking and SEO-friendly routing, plus an admin panel for inventory, orders and user roles.`,
  },
  {
    id: 'project-gtalk',
    title: 'Projects',
    text: `G-Talk is the assistant on this portfolio. It is a small Gemini 2.5 Flash chatbot: a curated knowledge base about Goutham is given to the model in its system prompt, and each visitor question is answered in a single API call, grounded in that knowledge only.`,
  },
  {
    id: 'interests',
    title: 'Interests',
    text: `Goutham is currently exploring generative AI and building creative tools with it. He is interested in product design, developer experience and AI features that add real value rather than novelty.`,
  },
  {
    id: 'contact',
    title: 'Contact',
    text: `You can reach Goutham through the contact form at the bottom of this site, by email at gouthamgopinath.tsi@gmail.com, by phone at +91 93420 33780, on LinkedIn at https://www.linkedin.com/in/goutham-g-98a0ba253/, on Instagram at https://www.instagram.com/tanger.ineee/ or on GitHub at https://github.com/1Goutham. He is based in Chennai, India and usually replies within a day.`,
  },
  {
    id: 'availability',
    title: 'Contact',
    text: `Goutham is open to freelance projects, collaborations and full-time roles involving front-end or full-stack development, product design, or applied AI. The best first step is a short message through the contact form describing the project.`,
  },
];
