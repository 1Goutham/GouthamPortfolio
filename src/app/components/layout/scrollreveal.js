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
    const isInViewport = el.getBoundingClientRect().top < window.innerHeight;
    const triggerStart = isInViewport ? 'top bottom' : 'top 90%';

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        scroller,
        start: triggerStart,
        end: rotationEnd,
        scrub: 0.7, // smoother
      },
    });

    if (isTextOnly) {
      const wordElements = el.querySelectorAll('.word');
      timeline.fromTo(
        wordElements,
        {
          opacity: baseOpacity,
          filter: enableBlur ? `blur(${blurStrength}px)` : 'none',
          willChange: 'opacity, filter',
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          stagger: 0.1, // slower reveal
          ease: 'power2.out',
          duration: 1.5,
        }
      );
    } else {
      timeline.fromTo(
        el,
        {
          opacity: baseOpacity,
          filter: enableBlur ? `blur(${blurStrength}px)` : 'none',
          willChange: 'opacity, filter',
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          ease: 'power2.out',
          duration: 1.8,
        }
      );
    }

    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
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
