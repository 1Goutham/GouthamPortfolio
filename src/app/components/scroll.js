"use client";

import ScrollVelocity from "./layout/scrollingtext";

export default function Scrolltext() {
  return (
    <div className="marquee bg-white py-2 md:py-4 flex justify-center items-center">
      <ScrollVelocity
        texts={[
          <span key="line1">
            <span className="font-semibold">Research</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>&nbsp;&nbsp;&nbsp;&nbsp;
            <span className="font-semibold">Design</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>&nbsp;&nbsp;&nbsp;&nbsp;
            <span className="font-semibold">Build</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>&nbsp;&nbsp;&nbsp;&nbsp;
            <span className="font-semibold">Ship</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>&nbsp;&nbsp;&nbsp;&nbsp;
            Notice the <span className="font-semibold">2px</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="marquee-star">✦</span>
          </span>,
        ]}
        velocity={50}
        scrollerStyle={{ fontFamily: "var(--font-montserrat)" }}
        className="text-black text-lg md:text-3xl font-regular"
      />
    </div>
  );
}
