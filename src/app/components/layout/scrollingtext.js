"use client"
import { useRef, useLayoutEffect, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from "framer-motion";

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    // ResizeObserver catches font-swap reflows, not just window resizes.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

/** True while the element is (nearly) on screen - lets us pause the rAF loop. */
function useInView(ref, rootMargin = "200px") {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/* One line of the marquee. Module level, so a re-render of the list never
   remounts it (which would reset its position). */
function VelocityText({
  children,
  baseVelocity = 100,
  scrollContainerRef,
  className = "",
  damping,
  stiffness,
  numCopies,
  velocityMapping,
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
}) {
  const baseX = useMotionValue(0);
  const scrollOptions = scrollContainerRef
    ? { container: scrollContainerRef }
    : {};
  const { scrollY } = useScroll(scrollOptions);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: damping ?? 50,
    stiffness: stiffness ?? 400,
  });
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping?.input || [0, 1000],
    velocityMapping?.output || [0, 5],
    { clamp: false }
  );

  const copyRef = useRef(null);
  const wrapperRef = useRef(null);
  const copyWidth = useElementWidth(copyRef);
  const inView = useInView(wrapperRef);

  function wrap(min, max, v) {
    const range = max - min;
    const mod = (((v - min) % range) + range) % range;
    return mod + min;
  }

  // Wrapped into (-width, 0], so the starting offset 0 stays 0: the
  // server-rendered line (at 0) and the first animated frame then match,
  // instead of the line hopping a whole copy when the script takes over.
  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return "0px";
    const w = wrap(-copyWidth, 0, v);
    return `${w === -copyWidth ? 0 : w}px`;
  });

  // When the copy's width changes (the web font arriving after the
  // fallback was measured), keep the same place in the loop: wrapping
  // the old offset at the new width would make the line jump sideways.
  const lastWidth = useRef(0);
  useEffect(() => {
    const old = lastWidth.current;
    if (old && copyWidth && old !== copyWidth) baseX.set((baseX.get() * copyWidth) / old);
    lastWidth.current = copyWidth;
  }, [copyWidth, baseX]);

  const directionFactor = useRef(1);
  // Under the cursor the marquee eases down to a crawl, so the line can be
  // read, and eases back up on leave. Refs only: no re-render, no jump.
  const slow = useRef(false);
  const speed = useRef(1);
  useAnimationFrame((t, rawDelta) => {
    // A long frame (hydration, a busy main thread) must not become a
    // jump: cap the step at about three frames' worth.
    const delta = Math.min(rawDelta, 50);
    // Skip all work while the marquee is off-screen, and don't start
    // until it has been measured.
    if (!inView || !copyWidth) return;
    const target = slow.current ? 0.12 : 1;
    speed.current += (target - speed.current) * Math.min(1, delta / 260);
    let moveBy = directionFactor.current * baseVelocity * speed.current * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const spans = [];
  for (let i = 0; i < (numCopies ?? 1); i++) {
    spans.push(
      <span
        className={`flex-shrink-0 ${className}`}
        key={i}
        ref={i === 0 ? copyRef : null}
        aria-hidden={i !== 0}
      >
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
      <motion.div
        className={`flex whitespace-nowrap text-center drop-shadow will-change-transform ${scrollerClassName ?? ""} ${className ?? ""}`}
        style={{ x, ...scrollerStyle }}
      >
        {spans}
      </motion.div>
    </div>
  );
}

export const ScrollVelocity = ({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = "",
  damping = 50,
  stiffness = 400,
  // 4 copies comfortably cover any viewport; the old 10 just bloated the DOM.
  numCopies = 4,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
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
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
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
