'use client';

import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ScrollReveal = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 6,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom',
}) => {
  const containerRef = useRef(null);
  const isTextOnly = typeof children === 'string';

  const splitText = useMemo(() => {
    if (!isTextOnly) return null;
    return children.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="inline-block word" key={index}>
          {word}
        </span>
      );
    });
  }, [children, isTextOnly]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller = scrollContainerRef?.current || window;

    // gsap.context scopes every tween/trigger to this element so cleanup only
    // kills what this component created (previously it killed *every* trigger).
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const isInViewport = el.getBoundingClientRect().top < window.innerHeight;
        const triggerStart = isInViewport ? 'top bottom' : 'top 90%';

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            scroller,
            start: triggerStart,
            end: rotationEnd,
            scrub: 0.7,
          },
        });

        const target = isTextOnly ? el.querySelectorAll('.word') : el;
        timeline.fromTo(
          target,
          {
            opacity: baseOpacity,
            y: 18,
            filter: enableBlur ? `blur(${blurStrength}px)` : 'none',
          },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            stagger: isTextOnly ? 0.1 : 0,
            ease: 'power2.out',
            duration: isTextOnly ? 1.5 : 1.8,
            // Drop the compositor hint once the reveal has settled.
            onComplete: () => gsap.set(target, { clearProps: 'filter,willChange' }),
          }
        );
      });

      // Reduced motion: content is simply visible.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(el, { opacity: 1, filter: 'none' });
      });
    }, el);

    return () => ctx.revert();
  }, [
    scrollContainerRef,
    enableBlur,
    baseRotation,
    baseOpacity,
    rotationEnd,
    wordAnimationEnd,
    blurStrength,
    isTextOnly,
  ]);

  return (
    <div ref={containerRef} className={`my-5 ${containerClassName}`}>
      {isTextOnly ? (
        <p
          className={`text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}
        >
          {splitText}
        </p>
      ) : (
        <div className={textClassName}>{children}</div>
      )}
    </div>
  );
};

export default ScrollReveal;
