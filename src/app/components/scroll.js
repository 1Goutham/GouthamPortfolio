"use client";

import ScrollVelocity from "./layout/scrollingtext";

export default function Scrolltext() {
  return (
    <div className="marquee bg-white py-2 md:py-4 flex justify-center items-center">
      <ScrollVelocity
        texts={[
          <span key="line1">
            Good <span className="font-semibold">design</span> makes you stay&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>&nbsp;&nbsp;&nbsp;&nbsp;
            Solid <span className="font-semibold">code</span> makes it work&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>&nbsp;&nbsp;&nbsp;&nbsp;
            The right <span className="font-semibold">AI</span> makes it think&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>
          </span>,
        ]}
        velocity={50}
        scrollerStyle={{ fontFamily: "var(--font-montserrat)" }}
        className="text-black text-lg md:text-3xl font-regular"
      />
    </div>
  );
}
