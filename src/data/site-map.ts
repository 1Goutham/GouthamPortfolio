/**
 * Everything the site agent can take a visitor to or point at.
 *
 * The server hands this list to the model so it can only name real places,
 * and checks every action it returns against it; the browser uses the same
 * entries to carry the action out. To make something new pointable, give it
 * an entry here (and, if it has no id, a `data-agent="<id>"` attribute).
 *
 *   path      page the target lives on
 *   selector  element to scroll to / spotlight once on that page
 *   hash      for /works: the panel to open (#who, #services, #contact)
 *   url       external targets open in a new tab instead
 */
export type SiteTarget = {
  id: string;
  label: string;
  description: string;
  path?: string;
  selector?: string;
  hash?: string;
  url?: string;
  /** Extra words a visitor might use, for the offline fallback planner. */
  words?: string[];
};

export const SITE_TARGETS: SiteTarget[] = [
  // Homepage
  { id: 'home', label: 'Home', path: '/', selector: 'header.hero', description: 'Top of the homepage: intro, the Thirukkural, links to work and contact.', words: ['home', 'top', 'start', 'main page'] },
  { id: 'about', label: 'About', path: '/', selector: '#about', description: 'Who Goutham is: current role, past work and education.', words: ['about', 'who is', 'bio', 'background', 'education', 'experience'] },
  { id: 'skills', label: 'Skills', path: '/', selector: '#skills', description: 'His toolkit: frontend, backend, design and AI skills.', words: ['skill', 'kit', 'stack', 'tech', 'tools', 'languages'] },
  { id: 'projects', label: 'Projects', path: '/', selector: '#projects', description: 'The four products on the homepage: Ideako, ZtudyLock, FabricNest and IdeaGuard AI.', words: ['project', 'work', 'portfolio', 'built', 'products'] },
  { id: 'project-ideako', label: 'Ideako', path: '/', selector: '[data-agent="project-ideako"]', description: 'Ideako, the AI creative partner (its mark in the Projects section).', words: ['ideako'] },
  { id: 'project-ztudylock', label: 'ZtudyLock', path: '/', selector: '[data-agent="project-ztudylock"]', description: 'ZtudyLock, the adaptive AI study workspace (its mark in the Projects section).', words: ['ztudylock', 'study'] },
  { id: 'project-fabricnest', label: 'FabricNest', path: '/', selector: '[data-agent="project-fabricnest"]', description: 'FabricNest, the intelligent commerce platform (its mark in the Projects section).', words: ['fabricnest', 'ecommerce', 'e-commerce', 'shop', 'store'] },
  { id: 'project-ideaguard', label: 'IdeaGuard AI', path: '/', selector: '[data-agent="project-ideaguard"]', description: 'IdeaGuard AI, the agentic product-intelligence workspace (its mark in the Projects section).', words: ['ideaguard'] },
  { id: 'works-strip', label: '1G-works strip', path: '/', selector: '.works-strip', description: 'The white "1Goutham Space Works" strip after Projects that leads to 1G-works.', words: [] },
  { id: 'beyond-teaser', label: 'A Bit More About Me', path: '/', selector: '#beyond', description: 'The teaser for his personal story on the homepage.', words: [] },
  { id: 'margin-teaser', label: 'Margin teaser', path: '/', selector: '#margin', description: 'The 1Gartlab sticker band on the homepage that leads to Margin.', words: [] },
  { id: 'gtalk', label: 'G-Talk', path: '/', selector: '#Gtalk', description: 'The G-Talk chat section on the homepage, for longer questions.', words: ['g-talk', 'gtalk', 'chat'] },
  { id: 'contact', label: 'Contact', path: '/', selector: '#contact', description: 'The contact section with the form, email and socials.', words: ['contact', 'reach', 'email', 'hire', 'message', 'talk', 'get in touch'] },

  // Pages
  { id: 'projects-page', label: 'Projects page', path: '/projects', description: 'The full projects page with every product in detail.', words: ['project page', 'all projects', 'projects page'] },
  { id: 'beyond-page', label: 'Beyond', path: '/beyond', description: 'His personal story: from freelance design to code to AI.', words: ['story', 'beyond', 'journey', 'personal'] },
  { id: 'arcade', label: 'Arcade', path: '/arcade', description: 'Five small retro games starring Goutham.', words: ['game', 'arcade', 'play', 'retro'] },
  { id: 'margin-page', label: 'Margin', path: '/margin', description: 'Margin by 1Gartlab: a drawing playground where you can sketch and send it to him.', words: ['draw', 'margin', 'sketch', 'art', 'paint', '1gartlab'] },
  { id: 'works', label: '1G-works', path: '/works', description: '1G-works, his freelance studio for businesses.', words: ['1g-works', '1gworks', 'works', 'freelance', 'studio', 'agency', 'business', 'service'] },
  { id: 'works-who', label: '1G-works: Who we are', path: '/works', hash: 'who', description: 'What 1G-works does for a business.', words: [] },
  { id: 'works-services', label: '1G-works: Our Services', path: '/works', hash: 'services', description: 'The four 1G-works services: Brand & Creative, Web & Digital, Digital Growth, Software & AI.', words: ['1g-works services', 'works services', 'services', 'branding', 'website for', 'seo', 'marketing'] },
  { id: 'works-contact', label: '1G-works: Contact to get started', path: '/works', hash: 'contact', description: 'The 1G-works enquiry form.', words: ['enquiry', 'enquire', 'quote', 'start a project'] },

  // Elsewhere
  { id: 'github', label: 'GitHub', url: 'https://github.com/1Goutham', description: 'His GitHub profile.', words: ['github', 'code', 'repo'] },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/goutham-g-98a0ba253/', description: 'His LinkedIn profile.', words: ['linkedin', 'cv', 'resume'] },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/tanger.ineee/', description: 'His Instagram.', words: ['instagram', 'insta'] },
  { id: 'email', label: 'Email', url: 'mailto:gouthamgopinath.tsi@gmail.com', description: 'Write him an email.', words: [] },
  { id: 'ideako-live', label: 'Ideako (live)', url: 'https://ideako.vercel.app/', description: 'The live Ideako app.', words: [] },
  { id: 'ztudylock-live', label: 'ZtudyLock (live)', url: 'https://ztudylock.vercel.app/', description: 'The live ZtudyLock app.', words: [] },
  { id: 'fabricnest-live', label: 'FabricNest (live)', url: 'https://aiecommerce-site.vercel.app/', description: 'The live FabricNest store.', words: [] },
  { id: 'ideaguard-live', label: 'IdeaGuard AI (live)', url: 'https://ideaguard-ai-zeta.vercel.app/', description: 'The live IdeaGuard AI app.', words: [] },
];

export const TARGETS_BY_ID = new Map(SITE_TARGETS.map((t) => [t.id, t]));

/**
 * What the agent can do:
 *   go     take the visitor to a target (page, section or panel)
 *   point  take them there and spotlight it, with a short note
 *   open   open an external target in a new tab
 */
export type AgentAction = { type: 'go' | 'point' | 'open'; target: string; note?: string };
export type AgentReply = { reply: string; actions: AgentAction[] };

/** Keep only actions that name a real target and fit it. */
export function validActions(raw: unknown): AgentAction[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentAction[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue;
    const { type, target, note } = a as Record<string, unknown>;
    if (type !== 'go' && type !== 'point' && type !== 'open') continue;
    if (typeof target !== 'string') continue;
    const t = TARGETS_BY_ID.get(target);
    if (!t) continue;
    // External targets can only be opened; on-site ones can't be "opened".
    const kind = t.url ? 'open' : type === 'open' ? 'go' : type;
    out.push({ type: kind, target, ...(typeof note === 'string' && note ? { note: note.slice(0, 90) } : {}) });
    if (out.length === 2) break;
  }
  return out;
}
