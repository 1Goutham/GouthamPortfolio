"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Waveform } from "@uiball/loaders";
import ChatMessage from "./Gtalk/ChatMessage";
import InputBox from "./Gtalk/InputBox";

// The ஜி-Talk lettering lives at /public/G-talk-logo.png.
const LOGO_SRC = "/G-talk-logo.png";

const PROMPTS = ["So, who’s behind G-Talk?", "What’s in your kit?", "How can I reach you?"];

type Pair = { user: string; bot: string | null };
type Mood = "idle" | "thinking" | "answered";

export default function Gtalk() {
  const [input, setInput] = useState("");
  const [pair, setPair] = useState<Pair | null>(null);
  const [history, setHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  // The asterisk turns with the scroll position, as on the other pages.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = starRef.current;
    if (!el) return;
    let id = 0;
    const paint = () => {
      id = 0;
      el.style.setProperty("--turn", `${(window.scrollY * 0.2).toFixed(2)}deg`);
    };
    const onScroll = () => {
      if (!id) id = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(id);
    };
  }, []);

  // A soft spotlight follows the cursor across the dark panel.
  const onPanelMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--rx", `${x.toFixed(0)}px`);
      el.style.setProperty("--ry", `${y.toFixed(0)}px`);
    });
  }, []);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);
    setMood("thinking");
    setPair({ user: question, bot: null });

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
        else toast.error(data?.detail ? `${data.error} (${data.detail})` : data?.error || "Error fetching response");
        setPair(null);
        setMood("idle");
        return;
      }

      const reply: string = data?.reply || "I'm not sure how to respond to that.";
      setPair({ user: question, bot: reply });
      setMood("answered");
      // Keep a short rolling history so follow-up questions have context.
      setHistory((h) => [...h, { role: "user" as const, text: question }, { role: "model" as const, text: reply }].slice(-8));
    } catch (err) {
      toast.error("Network or server error.");
      console.error("Caught error:", err);
      setPair(null);
      setMood("idle");
    } finally {
      setLoading(false);
    }
  };

  const pick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <section id="Gtalk" className="gtalk bg-black px-6 py-16 font-outfit text-white md:px-12 md:py-24" data-mood={mood}>
      <div className="gtalk-card mx-auto grid max-w-5xl overflow-hidden rounded-2xl md:grid-cols-[38%_1fr]">
        {/* Left: identity panel */}
        <div className="gtalk-id relative flex flex-col items-center justify-between bg-white px-6 py-8 text-black md:py-10">
          <p className="gtalk-caption text-xs text-black/80 md:text-sm">
            Curiosity starts here <span className="gtalk-smile inline-block">:)</span>
          </p>

          <div className="gtalk-logo my-6 w-[180px] select-none md:my-8 md:w-[220px]">
            <Image
              src={LOGO_SRC}
              alt="ஜி-Talk"
              width={880}
              height={620}
              sizes="(max-width: 768px) 180px, 220px"
              draggable={false}
              className="h-auto w-full"
            />
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <span className="bracket-link bracket-link-dark font-anonymous-pro text-base text-black md:text-lg">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text !mx-0">G-Talk</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </span>
            <span ref={starRef} className="turn-star text-lg leading-none md:text-xl" aria-hidden="true">
              &#10035;
            </span>
            <p className="leading-tight">
              <span className="block text-[11px] font-bold md:text-xs">Conversations</span>
              <span className="block text-[10px] text-black/70 md:text-[11px]">that bring us closer</span>
            </p>
          </div>
        </div>

        {/* Right: conversation panel */}
        <div
          ref={panelRef}
          onPointerMove={onPanelMove}
          className="gtalk-panel relative flex min-h-[380px] flex-col justify-center bg-[#1c1c1c] px-6 py-10 md:min-h-[430px] md:px-12"
        >
          <span className="gtalk-spot" aria-hidden="true" />

          <div className="relative flex-1 flex flex-col justify-center">
            {!pair ? (
              <div className="gtalk-idle md:text-right">
                <h2 className="gtalk-rise text-3xl font-semibold tracking-tight md:text-[2.6rem] md:leading-none" style={{ "--i": 0 } as React.CSSProperties}>
                  What&rsquo;s on your mind?
                </h2>
                <p className="gtalk-rise mt-3 text-base text-white/80 md:text-lg" style={{ "--i": 1 } as React.CSSProperties}>
                  Start with a question, an idea, or just a thought
                </p>
                <div className="gtalk-rise mt-6 flex flex-wrap gap-2 md:justify-end" style={{ "--i": 2 } as React.CSSProperties}>
                  {PROMPTS.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => pick(p)}
                      className="gtalk-chip rounded-md border border-white/20 px-3 py-1.5 text-[11px] text-white/90 md:text-xs"
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatMessage
                question={pair.user}
                reply={pair.bot}
                thinking={
                  <span className="inline-flex h-6 items-center">
                    <Waveform size={22} lineWeight={1.5} speed={1} color="#ffffff" />
                  </span>
                }
              />
            )}
          </div>

          <div className="relative mt-8">
            <InputBox
              ref={inputRef}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              handleKeyDown={handleKeyDown}
              busy={loading}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
