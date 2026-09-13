"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import React from "react";
import { useTypingEffect } from "./useTypingEffect";

interface ChatMessageProps {
  userQuestion: string;
  botReply: string | React.JSX.Element;
  /** Knowledge-base sections the answer was grounded in. */
  sources?: string[];
}

export default function ChatMessage({ userQuestion, botReply, sources = [] }: ChatMessageProps) {
  const botReplyStr = typeof botReply === "string" ? botReply : "";
  const typedText = useTypingEffect(botReplyStr);
  const isString = typeof botReply === "string";

  return (
    <div className="w-full flex justify-center items-start px-4 py-6">
      <div className="rise-in w-full max-w-3xl h-[450px] md:h-[220px] bg-[#F2F2F2] rounded-xl p-6 flex md:flex-row flex-col justify-between items-start overflow-hidden">
        <div className="md:w-2/3 w-full flex flex-col gap-3 overflow-hidden h-full">
          <p className="text-lg md:text-2xl font-medium text-black">
            {userQuestion}
          </p>
          <div
            data-lenis-prevent
            className="text-sm md:text-lg text-gray-800 leading-relaxed overflow-y-auto md:pr-2 h-40 md:h-full scrollbar-hide"
          >
            {isString ? <ReactMarkdown>{typedText}</ReactMarkdown> : botReply}
          </div>
          {sources.length > 0 && typedText.length >= botReplyStr.length && (
            <div className="rise-in flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
              <span className="uppercase tracking-[0.2em]">From</span>
              {sources.map((s) => (
                <span key={s} className="rounded-full border border-black/15 px-2 py-0.5 text-gray-700">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:w-1/3 h-[100px] md:h-[280px] flex justify-end items-end">
          <Image
            src="/response-avatar.webp"
            alt="AI Avatar"
            width={300}
            height={300}
            sizes="(max-width: 768px) 140px, 300px"
            className="object-contain translate-y-8 md:-translate-y-20"
          />
        </div>
      </div>
    </div>
  );
}
