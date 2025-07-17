"use client";

import { useState } from "react";
import ChatMessage from "./Gtalk/ChatMessage";
import InputBox from './Gtalk/InputBox';
import toast from 'react-hot-toast';
import Image from "next/image";
import { Waveform } from "@uiball/loaders";

export default function Gtalk() {
  const [input, setInput] = useState("");
  const [messagePair, setMessagePair] = useState<{
    user: string;
    bot: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setLoading(true);
    setMessagePair({ user: userMessage, bot: null });

    const systemPrompt = `You are G-Talk, a professional chatbot integrated into Goutham Gopinath’s personal portfolio. Respond clearly and concisely (1–2 sentences max) and help users learn more about Goutham’s skills, projects, experience, and interests.
      Goutham has completed a B.Tech in Artificial Intelligence and Data Science (2021–2025) at Sri Eshwar College of Engineering, Coimbatore, with a 8 CGPA. He currently works remotely as a Digital Engineer at DeepWeaver.AI (HQ: Australia), where he handles UI/UX design using Figma, Webflow, and design systems, and contributes to marketing through LinkedIn graphics and demo videos(only UI/Ux).
      Previously, he freelanced as a Full Stack Developer & Designer (2022–2023), building full-scale solutions for clients using the React stack, Webflow, and Figma—handling both design and frontend development, including client revisions and project launches.
      His major projects include:
      ZudyLock (2025): An AI-powered chatbot (Next.js, OpenAI API, MongoDB) that redirects students toward focused, career-based questions with safe, structured interaction.
      E-Commerce Platform (2024): Built with Next.js, TypeScript, and MongoDB; includes filtering, auth, cart, and SEO-friendly routing.
      Ideako (2024): An AI-powered creative tool for generating content ideas, captions, and hashtags.
      He’s skilled in:
      Languages: TypeScript, JavaScript, HTML5, CSS3
      Frameworks: React.js, Next.js, Express.js, Tailwind CSS, Vite
      Design Tools: Figma, Adobe Illustrator, Webflow
      DevOps: Git, GitHub, Vercel, Netlify, Docker, Postman
      Certifications include:
      Google UX Design Certificate
      IBM UI/UX Design Specialization
      Full Stack Web Development
      Generative AI Fundamentals
      AI Tools with KNIME & Tableau
      Goutham is currently exploring Generative AI and building creative tools using it. Always keep replies relevant, helpful, and professional. If the user asks personal, entertainment, or unrelated queries, politely redirect them toward career, tech, or design-focused questions.`;

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "user", parts: [{ text: userMessage }] },
    ];

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contents }),
      });

      const raw = await res.clone().text();
      if (!res.ok) {
        if (res.status === 429) toast.error("You’ve hit your API usage limit");
        else if (res.status === 403) toast.error("Invalid API key or access denied");
        else toast.error("Error fetching response");
        console.error("API error:", raw);
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        toast.error("Unexpected response format.");
        console.error("Malformed response:", raw);
        return;
      }

      const botReply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm not sure how to respond to that.";

      setMessagePair({ user: userMessage, bot: botReply });
    } catch (err) {
      toast.error("🔌 Network or server error.");
      console.error("Caught error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main id="Gtalk" className="bg-black h-[600px] md:h-[500px] font-outfit md:pt-10">
      <section className="flex justify-center items-center p-4 md:p-19 h-full">
        <div className="bg-white w-full h-[550px] md:h-[450px] mx-auto rounded-[10px] flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center px-4">
            {!messagePair ? (
              <div className="text-black px-4 justify-center md:justify-start -translate-y-5 md:-translate-x-21  md:-translate-y-8">
                <h2 className="text-xl lg:text-4xl md:text-3xl font-medium mb-2 pt-12 text-center md:text-start">
                  I’m{" "}
                  <span className="inline-flex align-middle">
                    <Image src="/chatAvatar.png" className=" w-[50px] -translate-y-2" width={60} height={60} alt="emoji" />
                  </span>{" "}
                  <span className="font-semibold">G-</span>Talk
                  <br />
                  Curious to know more?
                </h2>
                <div className="flex flex-col justify-center gap-2 pt-2 md:flex-row md:flex-wrap md:justify-start">
                  {[
                    "So, who’s behind G-Talk?",
                    "What’s in your kit?",
                    "How can I reach you?",
                  ].map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(rec)}
                      className="text-black text-base px-4 py-2 rounded-[10px] border border-black/40 bg-white/5 hover:bg-white/10 hover:scale-101 transition duration-200 cursor-pointer"
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatMessage
                userQuestion={messagePair.user}
                botReply={
                  loading ? (
                    <div className="flex pt-3 pl-3 h-24">
                      <Waveform size={20} lineWeight={1.5} speed={1} color="black" />
                    </div>
                  ) : messagePair.bot ?? "Sorry, I didn’t get that."
                }
              />
            )}
          </div>
          <div className="lg:mt-3">
            <div className="flex justify-center mt-3 w-full max-w-full overflow-hidden -translate-y-6 md:-translate-y-20">
              <InputBox
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                handleKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
