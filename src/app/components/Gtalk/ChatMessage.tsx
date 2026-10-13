"use client";

import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTypingEffect } from "./useTypingEffect";

interface ChatMessageProps {
  question: string;
  reply: string | null;
  thinking: React.ReactNode;
}

/**
 * One exchange: the question in bold, then the reply typing out underneath
 * with a caret that blinks while there is more to come.
 */
export default function ChatMessage({ question, reply, thinking }: ChatMessageProps) {
  const typed = useTypingEffect(reply ?? "", 18);
  const done = reply !== null && typed.length >= reply.length;

  // The reply scrolls if it is long; keep the newest line in view as it types.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [typed]);

  return (
    <div className="gtalk-exchange">
      <p className="gtalk-rise text-base font-semibold text-white md:text-lg" style={{ "--i": 0 } as React.CSSProperties}>
        {question}
      </p>
      <div
        ref={boxRef}
        data-lenis-prevent
        className="gtalk-rise gtalk-reply mt-2 max-h-[200px] overflow-y-auto text-sm leading-relaxed text-white/85 scrollbar-hide md:max-h-[230px] md:text-[15px]"
        style={{ "--i": 1 } as React.CSSProperties}
        aria-live="polite"
      >
        {reply === null ? (
          thinking
        ) : (
          <span className={done ? "" : "gtalk-typing"}>
            <ReactMarkdown>{typed}</ReactMarkdown>
          </span>
        )}
      </div>
    </div>
  );
}
