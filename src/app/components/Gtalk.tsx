"use client";

import { useState } from "react";
import ChatMessage from "./Gtalk/ChatMessage";
import InputBox from './Gtalk/InputBox';
import toast from 'react-hot-toast';
import Image from "next/image";
import { Waveform } from "@uiball/loaders";

export default function Gtalk() {
  const [input, setInput] = useState("");
  const [messagePair, setMessagePair] = useState<{ user: string; bot: string | null } | null>(null);
  const [history, setHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);
    setMessagePair({ user: question, bot: null });

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 429) toast.error("Too many questions at once. Give it a moment.");
        else if (res.status === 403) toast.error("The assistant is not configured correctly.");
        else toast.error(data?.error || "Error fetching response");
        setMessagePair(null);
        return;
      }

      const reply: string = data?.reply || "I'm not sure how to respond to that.";
      setMessagePair({ user: question, bot: reply });
      // Keep a short rolling history so follow-up questions have context.
      setHistory((h) => [...h, { role: "user" as const, text: question }, { role: "model" as const, text: reply }].slice(-8));
    } catch (err) {
      toast.error("🔌 Network or server error.");
      console.error("Caught error:", err);
      setMessagePair(null);
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
              <div className="rise-in text-black px-4 justify-center md:justify-start -translate-y-5 md:-translate-x-21  md:-translate-y-8">
                <h2 className="text-xl lg:text-4xl md:text-3xl font-medium mb-2 pt-12 text-center md:text-start">
                  I’m{" "}
                  <span className="inline-flex align-middle">
                    <Image src="/chatAvatar.png" className=" w-[50px] -translate-y-2 transition-transform duration-500 ease-out hover:rotate-12 hover:scale-110" width={60} height={60} alt="emoji" />
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
                      className="chip text-black text-base px-4 py-2 rounded-[10px] border border-black/40 bg-white/5 cursor-pointer"
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
