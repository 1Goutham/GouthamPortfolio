import { SITE_TARGETS, TARGETS_BY_ID, validActions, type AgentAction, type AgentReply } from '../data/site-map';
import { asContext, retrieve } from './rag';
import { ProviderError, VOICE_RULES, complete, providerOrder, recentContext, type Turn } from './gtalk';

/**
 * The site agent: G-Talk that can also act on the page.
 *
 *   question + current page ──► retrieve knowledge (RAG)
 *     ──► model returns JSON { reply, actions } ──► actions checked against
 *         the site map (src/data/site-map.ts) ──► the browser carries them out
 *
 * When no provider is configured, or every provider fails, a small keyword
 * planner answers instead, so "take me to his projects" still works.
 */

const catalog = SITE_TARGETS.map((t) => `- ${t.id}: ${t.label}. ${t.description}${t.url ? ' (external)' : ` (on ${t.path}${t.hash ? `#${t.hash}` : ''})`}`).join('\n');

const agentPrompt = (knowledge: string, path: string) => `You are the G-Talk agent, the guide stuck to the corner of Goutham Gopinath's portfolio website. You answer questions about Goutham and you can move the visitor around the site. Speak about Goutham in the third person, warmly, like a helpful friend who knows the site.

The visitor is currently on: ${path}

You can act with these actions:
- go: take the visitor to a target (a page, a section, or a 1G-works panel).
- point: take them there and spotlight the thing, with a short note (max 8 words) shown beside it. Use this when they ask to see, show, find or point out something specific.
- open: open an external target (GitHub, LinkedIn, Instagram, email, live apps) in a new tab. Only when they clearly ask to open or visit it.

TARGETS (use these ids only):
${catalog}

Rules:
${VOICE_RULES}
- Reply in one or two short sentences, plain text. When you act, say what you are doing ("Here are his projects.").
- Act only when it helps: navigation requests, "show me", "where is", or when a place on the site answers the question better than words (e.g. questions about hiring or a project for a business -> 1G-works). Pure questions need no action.
- At most two actions. Never invent target ids.
- Respond with ONLY a JSON object: {"reply": "...", "actions": [{"type": "go" | "point" | "open", "target": "<id>", "note": "<optional>"}]}

KNOWLEDGE (the entries most relevant to this question):
${knowledge}`;

/** Pull a JSON object out of a reply, tolerating code fences or stray prose. */
function parse(text: string): AgentReply | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; actions?: unknown };
    const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
    if (!reply) return null;
    return { reply, actions: validActions(data.actions) };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Offline planner                                                     */
/* ------------------------------------------------------------------ */

const OFFLINE_REPLY: Record<string, string> = {
  projects: 'Here are his projects: Ideako, ZtudyLock, FabricNest and IdeaGuard AI.',
  'projects-page': 'Opening the projects page with every product in detail.',
  contact: 'Here is how to reach him: the form, email and socials are all down here.',
  skills: 'Here is his kit: frontend, backend, design and AI.',
  about: 'Here is a bit about him.',
  works: '1G-works is his studio for businesses. Taking you there.',
  'works-services': 'These are the four 1G-works services.',
  'works-contact': 'Here is the 1G-works enquiry form.',
  'margin-page': 'Margin is a drawing playground. Grab a pen!',
  arcade: 'Five retro games, starring Goutham. Have fun.',
  'beyond-page': 'His story, not the resume version.',
};

/** Best-effort intent match on the site map's own words. */
export function offlinePlan(question: string): AgentReply {
  const q = question.toLowerCase();
  let best: { id: string; score: number } | null = null;
  for (const t of SITE_TARGETS) {
    const words = [t.label.toLowerCase(), ...(t.words ?? [])];
    const score = words.reduce((s, w) => (w && q.includes(w) ? s + w.length : s), 0);
    if (score && (!best || score > best.score)) best = { id: t.id, score };
  }
  if (!best) {
    return {
      reply: "I can take you around: try \"show me his projects\", \"what is 1G-works?\" or \"how can I reach him?\"",
      actions: [],
    };
  }
  const t = TARGETS_BY_ID.get(best.id)!;
  const specific = t.selector?.startsWith('[data-agent');
  const action: AgentAction = t.url
    ? { type: 'open', target: t.id }
    : { type: specific || /\b(point|where|find)\b/i.test(q) ? 'point' : 'go', target: t.id, ...(specific ? { note: t.label } : {}) };
  // External links are only ever offered as a button, never opened unasked.
  const reply = OFFLINE_REPLY[t.id] ?? `Here you go: ${t.label}.`;
  return { reply, actions: [action] };
}

/* ------------------------------------------------------------------ */

export async function plan(question: string, history: Turn[], path: string): Promise<AgentReply & { offline?: boolean }> {
  if (providerOrder().length === 0) return { ...offlinePlan(question), offline: true };
  try {
    const chunks = await retrieve(question, recentContext(history), 5);
    const { reply } = await complete(agentPrompt(asContext(chunks), path), question, history, { json: true, temperature: 0.2 });
    return parse(reply) ?? { reply: reply.replace(/[{}"]/g, '').slice(0, 400), actions: [] };
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;
    console.error('Agent: providers failed, using the offline planner.', err.message);
    return { ...offlinePlan(question), offline: true };
  }
}
