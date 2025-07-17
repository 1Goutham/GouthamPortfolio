"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import React from "react";
import { useTypingEffect } from "./useTypingEffect";

interface ChatMessageProps {
  userQuestion: string;
  botReply: string | React.JSX.Element;
}

export default function ChatMessage({ userQuestion, botReply }: ChatMessageProps) {
  const botReplyStr = typeof botReply === "string" ? botReply : "";
  const typedText = useTypingEffect(botReplyStr);
  const isString = typeof botReply === "string";

  return (
    <div className="w-full flex justify-center items-start px-4 py-6">
      <div className="w-full max-w-3xl h-[450px] md:h-[220px] bg-[#F2F2F2] rounded-xl p-6 flex md:flex-row flex-col justify-between items-start overflow-hidden">
        <div className="md:w-2/3 flex flex-col gap-3 max-w-[75%] overflow-hidden h-full">
          <p className="text-lg md:text-2xl font-medium text-black">
            {userQuestion}
          </p>
          <div className="text-sm md:text-lg text-gray-800 leading-relaxed overflow-y-auto md:pr-2 h-40 md:h-full scrollbar-hide">
            {isString ? <ReactMarkdown>{typedText}</ReactMarkdown> : botReply}
          </div>
        </div>
        <div className="md:w-1/3 h-[100px] md:h-[280px] flex justify-end items-end">
          <Image
            src="/response-avatar.png"
            alt="AI Avatar"
            width={300}
            height={300}
            className="object-contain translate-y-8 md:-translate-y-20"
          />
        </div>
      </div>
    </div>
  );
}
