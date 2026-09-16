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

## G-Talk (chatbot)

G-Talk answers visitor questions with a single Gemini call per question:

1. The knowledge base in `src/data/knowledge.ts` is a short list of entries about Goutham (bio, experience, skills, projects, contact).
2. `src/lib/gtalk.ts` folds the whole list into the system prompt, grouped by section, and asks `gemini-3.6-flash` to answer only from it. The last few turns of the conversation are sent along for follow-ups.
3. The API route `src/app/api/gemini/route.ts` validates the request, applies a light per-IP rate limit and returns `{ reply }`.

There is no embedding or retrieval step, so nothing needs to be indexed or warmed up.

### Setup

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (from Google AI Studio). `GEMINI_CHAT_MODEL` is an optional override.

### Adding knowledge

Append an entry to `KNOWLEDGE` in `src/data/knowledge.ts`. Keep each entry to one topic and roughly 40 to 120 words; the `title` is the section it is filed under in the prompt.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
