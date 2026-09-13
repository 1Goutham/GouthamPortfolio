This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## G-Talk (RAG chatbot)

G-Talk answers visitor questions using retrieval-augmented generation on the Gemini API:

1. The knowledge base in `src/data/knowledge.ts` is a list of short chunks about Goutham (bio, experience, skills, projects, contact).
2. On the first request each chunk is embedded with `gemini-embedding-001` and cached in memory (`src/lib/rag.ts`). The cache is keyed by a hash of the text, so editing the knowledge base and redeploying is all that's needed.
3. A visitor's question is embedded, ranked against the chunks by cosine similarity blended with keyword overlap, and the best matches are passed as context to `gemini-2.5-flash`, which is instructed to answer only from that context.
4. The API route `src/app/api/gemini/route.ts` returns `{ reply, sources }`; the chat UI shows which sections the answer came from and keeps a short history for follow-ups.

If embeddings are unavailable the search falls back to keyword matching so the bot keeps working.

### Setup

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (from Google AI Studio). `GEMINI_CHAT_MODEL` and `GEMINI_EMBED_MODEL` are optional overrides.

### Adding knowledge

Append an entry to `KNOWLEDGE` in `src/data/knowledge.ts`. Keep each chunk to one topic and roughly 40 to 120 words; the `title` is what visitors see as the source label.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
