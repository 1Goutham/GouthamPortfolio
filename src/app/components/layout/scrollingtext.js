"use client"
import { useRef, useEffect } from "react";

/*
 * The homepage marquee: a line that drifts at a steady pace, speeds up with
 * the page's scroll (and turns round when you scroll back up), and eases to
 * a crawl under the cursor so it can be read. One small frame loop, which
 * only runs while the line is on screen and not at all with reduced motion.
 */

// Smoothing for the scroll speed, standing in for the old spring (per ms).
const VELOCITY_EASE = 1 / 90;

/* One line of the marquee. Module level, so a re-render of the list never
   remounts it (which would reset its position). */
function VelocityText({
  children,
  baseVelocity = 100,
  className = "",
  numCopies,
  velocityMapping,
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
}) {
  const wrapperRef = useRef(null);
  const trackRef = useRef(null);
  const copyRef = useRef(null);
  const slow = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!wrapper || !track || !copy) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const [inLo, inHi] = velocityMapping?.input || [0, 1000];
    const [outLo, outHi] = velocityMapping?.output || [0, 5];
    const factorOf = (v) => outLo + ((v - inLo) / (inHi - inLo)) * (outHi - outLo);

    let width = copy.offsetWidth;
    let x = 0; // kept in (-width, 0]
    let dir = 1;
    let speed = 1;
    let vel = 0; // smoothed scroll speed, px/s
    let lastY = window.scrollY;
    let last = 0;
    let raf = 0;

    const wrap = (v) => (width ? ((((v % width) + width) % width) - width) % width : 0);

    const frame = (t) => {
      // A long frame (a busy main thread) must not become a jump.
      const dt = last ? Math.min(t - last, 50) : 16;
      last = t;
      const y = window.scrollY;
      const raw = ((y - lastY) / dt) * 1000;
      lastY = y;
      vel += (raw - vel) * Math.min(1, dt * VELOCITY_EASE);

      speed += ((slow.current ? 0.12 : 1) - speed) * Math.min(1, dt / 260);
      const f = factorOf(vel);
      if (f < -0.01) dir = -1;
      else if (f > 0.01) dir = 1;
      let move = dir * baseVelocity * speed * (dt / 1000);
      move += dir * move * f;
      x = wrap(x + move);
      track.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf) return;
      last = 0;
      lastY = window.scrollY;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "200px" });
    io.observe(wrapper);

    // When the copy's width changes (the web font arriving after the
    // fallback was measured), keep the same place in the loop.
    const ro = new ResizeObserver(() => {
      const w = copy.offsetWidth;
      if (w && width && w !== width) x = (x * w) / width;
      width = w;
    });
    ro.observe(copy);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
    };
  }, [baseVelocity, velocityMapping]);

  const spans = [];
  for (let i = 0; i < (numCopies ?? 1); i++) {
    spans.push(
      <span className={`flex-shrink-0 ${className}`} key={i} ref={i === 0 ? copyRef : null} aria-hidden={i !== 0}>
        {children}
      </span>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`${parallaxClassName ?? ""} relative w-full overflow-hidden`}
      style={parallaxStyle}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") slow.current = true;
      }}
      onPointerLeave={() => {
        slow.current = false;
      }}
    >
      <div
        ref={trackRef}
        className={`flex whitespace-nowrap text-center drop-shadow will-change-transform ${scrollerClassName ?? ""} ${className ?? ""}`}
        style={scrollerStyle}
      >
        {spans}
      </div>
    </div>
  );
}

export const ScrollVelocity = ({
  texts = [],
  velocity = 100,
  className = "",
  // 4 copies comfortably cover any viewport; the old 10 just bloated the DOM.
  numCopies = 4,
  velocityMapping,
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
}) => {
  return (
    <section className="w-full">
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxClassName={parallaxClassName}
          scrollerClassName={scrollerClassName}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
        >
          &nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;&nbsp;
        </VelocityText>
      ))}
    </section>
  );
};

export default ScrollVelocity;
