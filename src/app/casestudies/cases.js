// The case files. Facts follow src/data/knowledge.ts: no user numbers,
// traction or metrics, and anything still being explored is said to be.

export const CASES = [
  {
    id: "ideako",
    name: "Ideako",
    file: "Ideako",
    tagline: "AI Creative Partner",
    art: "notebook",
    icon: "/ideako.png",
    tile: "#efeeea",
    bare: true,
    screen: "/Ideakoss.jpg",
    live: "https://ideako.vercel.app/",
    code: "https://github.com/1Goutham/Ideako",
    role: "Product, design & engineering",
    stack: ["Next.js", "Multi-model AI", "Vercel"],
    brief:
      "A creative workspace that learns how you write, keeps your references close, and turns rough ideas into posts that still sound like you.",
    problem:
      "Most AI writing tools start from a blank prompt and answer in the same polished, generic voice. Creators end up rewriting the draft until it sounds like them again, which is the slow part they wanted help with.",
    built:
      "Ideako starts from the person, not the prompt. A voice profile captures how you write, a reference library holds what you admire, and generation works inside both. Drafts can be refined line by line, with insights and hashtags that fit the post rather than the trend.",
    flow: ["Voice profile", "References", "Generate", "Refine", "Post"],
    decisions: [
      ["Voice before velocity", "The profile comes first in onboarding, so the first draft is already close instead of fast and wrong."],
      ["References as context", "Saved examples shape tone and structure, so it learns taste without anyone writing a style guide."],
      ["More than one model", "Different steps use different models, so drafting, refining and tagging each get the one that suits them."],
    ],
    next: "Sharper insights from your content history, and voice that adapts per platform.",
  },
  {
    id: "ztudylock",
    name: "ZtudyLock",
    file: "ZtudyLock",
    tagline: "Adaptive AI Study Workspace",
    art: "planner",
    icon: "/ztudylock.png",
    tile: "#0a0a0a",
    screen: "/ZLss.jpg",
    live: "https://ztudylock.vercel.app/",
    code: "https://github.com/1Goutham/ZtudyLock",
    role: "Product, design & engineering",
    stack: ["Next.js", "AI tutor", "Vercel"],
    brief:
      "A study workspace that reads your own notes and turns them into a plan: understand, practise, find the weak spots, revise what needs it.",
    problem:
      "Students don't lack content; they lack direction. Generic chatbots answer questions but don't know the syllabus in front of you, and they can't tell which topics you keep getting wrong.",
    built:
      "Upload your material and ZtudyLock pulls out the concepts, builds an adaptive plan, and tutors from your notes rather than the open web. Quizzes and flashcards feed weakness detection, so revision passes go where the gaps are, with mastery tracked per concept and an exam mode for the last stretch.",
    flow: ["Upload", "Understand", "Practise", "Find gaps", "Revise", "Master"],
    decisions: [
      ["Grounded in your material", "The tutor answers from the student's own notes, so explanations match what the exam will ask."],
      ["Weakness is the signal", "Practice results decide what comes back next, instead of a fixed schedule."],
      ["A plan, not a chat", "The study plan is the home screen; the tutor is one step inside it."],
    ],
    next: "Being explored: persistent memory, retrieval over larger libraries, multi-agent help and learning analytics.",
  },
  {
    id: "fabricnest",
    name: "FabricNest",
    file: "FabricNest",
    tagline: "Intelligent Commerce Platform",
    art: "swatch",
    icon: "/fabricnest.png",
    tile: "#1a1a1a",
    screen: "/FNss.jpg",
    live: "https://aiecommerce-site.vercel.app/",
    code: "https://github.com/1Goutham/fabric-store",
    role: "Full-stack engineering & design",
    stack: ["Next.js", "TypeScript", "MongoDB", "Stripe"],
    brief:
      "A full commerce platform where you can describe what you need and find it, with real checkout, orders and an admin behind the storefront.",
    problem:
      "Store search expects the exact product name. Shoppers think in intent (something warm for a cold walk), and most AI shop demos stop before anything can actually be bought.",
    built:
      "FabricNest pairs a premium storefront with intent-based discovery and an AI shopping assistant, then carries it all the way through: personalised recommendations, search and filters, cart and wishlist, Stripe checkout, order management and an admin system to run it.",
    flow: ["Describe", "Discover", "Compare", "Cart", "Checkout", "Orders"],
    decisions: [
      ["End to end, for real", "Stripe checkout, orders and admin are part of the build, so the AI sits inside a store that works."],
      ["Intent over keywords", "Discovery reads what the shopper means, with filters still there for those who know exactly what they want."],
      ["Personalisation that earns trust", "Recommendations grow from what you browse and keep, and stay quiet until there is something to go on."],
    ],
    next: "Richer recommendations as browsing history grows, and a more conversational assistant.",
  },
  {
    id: "ideaguard",
    name: "IdeaGuard AI",
    file: "IdeaGuard",
    tagline: "AI Product Intelligence",
    art: "dossier",
    icon: "/ideaguard.png",
    tile: "#0f0f0f",
    screen: "/IGss.jpg",
    live: "https://ideaguard-ai-zeta.vercel.app/",
    code: "https://github.com/1Goutham/IdeaGuardAI",
    role: "Product, AI & engineering",
    stack: ["Multi-agent AI", "Web app", "Vercel"],
    brief:
      "An agentic workspace that researches an early idea, stress-tests it, and hands back an evidence-backed plan: market, risks, MVP and a PRD.",
    problem:
      "Founders fall for ideas before testing them. Validation means market research, competitors, feasibility and risk, which is days of work, so it gets skipped or done once and forgotten.",
    built:
      "IdeaGuard runs that work as a team of agents. Each takes one lens (market, competition, feasibility, risk) and challenges the idea's assumptions, then the findings come together as an MVP plan, experiments to run, and a PRD with a technical blueprint.",
    flow: ["Idea", "Research", "Stress-test", "Validate", "MVP plan", "PRD"],
    decisions: [
      ["Agents with one job each", "Separate agents per lens keep each analysis focused, and let them disagree before anything is concluded."],
      ["Assumptions on trial", "The idea's assumptions are listed and tested on purpose, rather than only researched around."],
      ["Ends in something buildable", "The output is a PRD and blueprint, not a report, so the next step is already written."],
    ],
    next: "Started as a local prototype (Streamlit, Ollama, Gemma 3); now a web workspace. Deeper evidence sourcing is next.",
  },
  {
    id: "portfolio",
    name: "1Goutham Space",
    file: "This site",
    tagline: "Portfolio as a product",
    art: "polaroid",
    icon: "/project-icon.png",
    tile: "#111",
    screen: "/og/home.jpg",
    wide: true,
    live: "https://1goutham.space/",
    role: "Design & engineering",
    stack: ["Next.js", "Tailwind CSS", "WebGL", "Three.js"],
    brief:
      "The site you're on: built like a product, with a live portrait, a working Win98 desktop, a paper-plane contact form and an agent that knows the work.",
    problem:
      "Portfolios tend to list skills and hope you believe them. The site itself is the most direct proof of how I design and build, so it has to show it rather than say it.",
    built:
      "Every section is a small product of its own: eyes that follow you through WebGL, an About page that's a desktop with Paint, a media player, 3D phones, the Margin art wall and G-Talk. Underneath it stays fast, with lazy loading, frame loops that sleep, and a still fallback where there's no GPU.",
    flow: ["Concept", "Design", "Build", "Motion", "Speed", "Ship"],
    decisions: [
      ["Play with a purpose", "Each interaction says something about the work: Paint for design, the agent for AI, the plane for getting in touch."],
      ["Fast first", "Libraries came out when lighter code could do the same; frame loops pause when nothing moves."],
      ["Everyone gets in", "Keyboard paths through every toy, and reduced motion keeps it all calm."],
    ],
    next: "More case files as the products grow.",
  },
];
